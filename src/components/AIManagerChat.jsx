import React, { useState, useEffect, useRef } from 'react';
import { useWysh } from '../WyshContext';
import { 
  sendAIManagerMessage, 
  pushChatMessageToSupabase,
  fetchChatSessionsFromSupabase, 
  fetchChatMessagesBySession 
} from '../services/supabaseService';

export const AIManagerChat = () => {
  const { isAdminLoggedIn } = useWysh();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => 'sess-' + Date.now());

  // Past History View States
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedPastSession, setSelectedPastSession] = useState(null);
  const [pastMessages, setPastMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Resizing state (Default: 390px x 560px, Limits: Min 350x450, Max 800x900)
  const [dimensions, setDimensions] = useState({ width: 390, height: 560 });
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 390, height: 560 });

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!showHistoryView) {
      scrollToBottom();
    }
  }, [messages, isLoading, showHistoryView]);

  // Handle Window Resize via Top-Left Corner Dragging
  const handleMouseDown = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizingRef.current) return;
    const deltaX = resizeStartRef.current.x - e.clientX;
    const deltaY = resizeStartRef.current.y - e.clientY;

    const newWidth = Math.min(800, Math.max(350, resizeStartRef.current.width + deltaX));
    const newHeight = Math.min(900, Math.max(450, resizeStartRef.current.height + deltaY));

    setDimensions({ width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Start a fresh new chat session
  const startNewChatSession = () => {
    const newSessId = 'sess-' + Date.now();
    setSessionId(newSessId);
    setMessages([]);
    setShowHistoryView(false);
    setSelectedPastSession(null);
    triggerBriefing(newSessId);
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    if (messages.length === 0 && !showHistoryView) {
      startNewChatSession();
    }
  };

  const triggerBriefing = async (activeSessId) => {
    setIsLoading(true);
    const currentSessId = activeSessId || sessionId;
    try {
      const reply = await sendAIManagerMessage('', 'briefing', currentSessId);
      const aiMsg = {
        id: 'brief-' + Date.now(),
        sender: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([aiMsg]);
      pushChatMessageToSupabase('assistant', reply, currentSessId, '생산 현황 및 일일 브리핑');
    } catch (err) {
      setMessages([
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: "⚠️ 안녕하세요! WYSH AI 생산매니저입니다. 무엇을 도와드릴까요?",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsgText = inputValue.trim();
    setInputValue('');

    const userMsgObj = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsgObj]);
    setIsLoading(true);

    // Push user message to DB asynchronously
    pushChatMessageToSupabase('user', userMsgText, sessionId, userMsgText.substring(0, 30));

    try {
      const reply = await sendAIManagerMessage(userMsgText, 'chat', sessionId);
      const aiReplyObj = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiReplyObj]);
      pushChatMessageToSupabase('assistant', reply, sessionId, userMsgText.substring(0, 30));
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: "⚠️ 메시지 응답을 받아오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Past Sessions List
  const handleOpenHistoryView = async () => {
    setShowHistoryView(true);
    setIsLoadingHistory(true);
    setSelectedPastSession(null);
    try {
      const sessions = await fetchChatSessionsFromSupabase();
      setPastSessions(sessions);
    } catch (e) {
      console.warn("Failed to load past sessions", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Select a specific past session to view messages
  const handleSelectPastSession = async (session) => {
    setSelectedPastSession(session);
    setIsLoadingHistory(true);
    try {
      const rawMsgs = await fetchChatMessagesBySession(session.sessionId);
      const formatted = rawMsgs.map(m => ({
        id: m.id,
        sender: m.role === 'user' ? 'user' : 'ai',
        text: m.content,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setPastMessages(formatted);
    } catch (e) {
      console.warn("Failed to load past session messages", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isAdminLoggedIn) return null;

  return (
    <div style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999, fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' }}>
      {!isOpen ? (
        /* WYSH 브랜드 시그니처 둥근 플로팅 챗 버튼 */
        <button
          onClick={handleOpenChat}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '2px solid #000000',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.3)';
          }}
        >
          <img
            src="/WYSH2_로고_1772157440156.webp"
            alt="WYSH Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            fontSize: '9px',
            fontWeight: '900',
            padding: '2px 6px',
            borderRadius: '6px',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
          }}>
            BETA
          </span>
        </button>
      ) : (
        /* WYSH 모던 블랙 컨셉 AI 생산매니저 모달 (가변 크기 적용) */
        <div style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          backgroundColor: '#0D0D0D',
          color: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          position: 'relative',
          transition: isResizingRef.current ? 'none' : 'width 0.1s ease, height 0.1s ease'
        }}>
          {/* Top-Left Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            title="드래그하여 창 크기 조절 (최소 350x450 ~ 최대 800x900)"
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '20px',
              height: '20px',
              cursor: 'nwse-resize',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#FFFFFF" strokeWidth="1.5">
              <path d="M 0 10 L 10 0 M 0 5 L 5 0 M 0 10 L 0 0 L 10 0" />
            </svg>
          </div>

          {/* WYSH Header */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#000000',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            userSelect: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}>
                <img
                  src="/WYSH2_로고_1772157440156.webp"
                  alt="WYSH Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                    AI 생산매니저
                  </h4>
                  <span style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    BETA
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                  {showHistoryView ? '📜 지난 대화 이력 보기' : '⚡ 신규 세션 진행 중'}
                </div>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showHistoryView ? (
                <button
                  onClick={() => setShowHistoryView(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  💬 대화창으로
                </button>
              ) : (
                <>
                  <button
                    onClick={startNewChatSession}
                    title="새로운 채팅 세션 시작"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ✨ 새 대화
                  </button>
                  <button
                    onClick={handleOpenHistoryView}
                    title="지난 대화 이력 보기"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    📜 기록
                  </button>
                </>
              )}

              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          {showHistoryView ? (
            /* PAST CHAT HISTORY VIEW PANEL */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#121212' }}>
              {selectedPastSession ? (
                /* Selected Past Session Message Detail Viewer */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: '#1A1A1A', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      onClick={() => setSelectedPastSession(null)}
                      style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                    >
                      ← 목록으로 돌아가기
                    </button>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      {new Date(selectedPastSession.createdAt).toLocaleDateString()} 이력
                    </span>
                  </div>

                  <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {isLoadingHistory ? (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>대화 내용을 불러오는 중...</div>
                    ) : pastMessages.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>저장된 메시지가 없습니다.</div>
                    ) : (
                      pastMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            backgroundColor: msg.sender === 'user' ? '#FFFFFF' : '#222222',
                            color: msg.sender === 'user' ? '#000000' : '#FFFFFF',
                            fontSize: '13.5px',
                            lineHeight: '1.55',
                            whiteSpace: 'pre-wrap',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)'
                          }}>
                            {msg.text}
                          </div>
                          <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px', padding: '0 4px' }}>
                            {msg.time}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Past Sessions List */
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                    과거 대화 목록 ({pastSessions.length}건)
                  </div>
                  {isLoadingHistory ? (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>지난 기록을 가져오는 중...</div>
                  ) : pastSessions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '30px' }}>저장된 과거 대화 이력이 없습니다.</div>
                  ) : (
                    pastSessions.map((sess) => (
                      <div
                        key={sess.sessionId}
                        onClick={() => handleSelectPastSession(sess)}
                        style={{
                          padding: '14px 16px',
                          backgroundColor: '#1A1A1A',
                          borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#262626';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1A1A1A';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF' }}>
                            {sess.sessionTitle || '생산 현황 질의'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {new Date(sess.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sess.lastMessage || '대화 내용 보기'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ACTIVE CHAT WINDOW */
            <>
              {/* Chat Message History */}
              <div style={{
                flex: 1,
                padding: '20px 18px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '85%',
                      padding: '13px 18px',
                      borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      backgroundColor: msg.sender === 'user' ? '#FFFFFF' : '#1A1A1A',
                      color: msg.sender === 'user' ? '#000000' : '#FFFFFF',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                      border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {msg.text}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.4)',
                      marginTop: '4px',
                      padding: '0 4px'
                    }}>
                      {msg.time}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                    <div className="spinner" style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>AI가 생산 데이터를 분석 중입니다...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Form */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#000000',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  gap: '10px'
                }}
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="예: 오늘 발효 리포트 현황 알려줘"
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    backgroundColor: '#1A1A1A',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FFFFFF'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '0 18px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                    opacity: isLoading || !inputValue.trim() ? 0.4 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  전송
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};
