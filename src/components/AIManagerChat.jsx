import React, { useState, useEffect, useRef } from 'react';
import { useWysh } from '../WyshContext';
import { sendAIManagerMessage, fetchChatHistoryFromSupabase } from '../services/supabaseService';

export const AIManagerChat = () => {
  const { isAdminLoggedIn } = useWysh();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasBriefed, setHasBriefed] = useState(false);
  
  // Resizing state (Default: 390px x 560px, Limits: Min 350x450, Max 800x900)
  const [dimensions, setDimensions] = useState({ width: 390, height: 560 });
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 390, height: 560 });

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isAdminLoggedIn) {
      loadHistory();
    }
  }, [isAdminLoggedIn]);

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
    const deltaX = resizeStartRef.current.x - e.clientX; // Moving left increases width
    const deltaY = resizeStartRef.current.y - e.clientY; // Moving up increases height

    const newWidth = Math.min(800, Math.max(350, resizeStartRef.current.width + deltaX));
    const newHeight = Math.min(900, Math.max(450, resizeStartRef.current.height + deltaY));

    setDimensions({ width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const loadHistory = async () => {
    try {
      const history = await fetchChatHistoryFromSupabase();
      if (history && history.length > 0) {
        setMessages(history.map(h => ({
          id: h.id,
          sender: h.role === 'user' ? 'user' : 'ai',
          text: h.content,
          time: new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
        setHasBriefed(true);
      }
    } catch (e) {
      console.warn("Failed to load chat history", e);
    }
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    if (!hasBriefed && messages.length === 0) {
      triggerBriefing();
    }
  };

  const triggerBriefing = async () => {
    setIsLoading(true);
    setHasBriefed(true);
    try {
      const reply = await sendAIManagerMessage('', 'briefing');
      setMessages(prev => [
        ...prev,
        {
          id: 'brief-' + Date.now(),
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: "⚠️ Supabase Edge Function 연동 중 문제가 발생했거나 API 키 설정이 필요한 상태입니다.",
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

    const newMsg = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const reply = await sendAIManagerMessage(userMsgText, 'chat');
      setMessages(prev => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
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

  if (!isAdminLoggedIn) return null;

  return (
    <div style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999, fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' }}>
      {!isOpen ? (
        /* WYSH 브랜드 시그니처 둥근 블랙 플로팅 챗 버튼 */
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
          
          {/* BETA Badge Indicator */}
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
          {/* Top-Left Resize Handle (드래그 조절 영역) */}
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
            padding: '18px 22px',
            backgroundColor: '#000000',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            userSelect: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                boxShadow: '0 2px 8px rgba(255,255,255,0.2)'
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
                  {/* BETA Badge */}
                  <span style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    BETA
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#888888', fontWeight: '500' }}>WYSH Production Advisor</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Preset Size Toggle Button */}
              <button
                onClick={() => {
                  if (dimensions.width > 500) {
                    setDimensions({ width: 390, height: 560 });
                  } else {
                    setDimensions({ width: 600, height: 750 });
                  }
                }}
                title={dimensions.width > 500 ? "기본 크기로 축소" : "창 확대"}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888888',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#888888'}
              >
                {dimensions.width > 500 ? '🗗' : '🗖'}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888888',
                  fontSize: '22px',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#888888'}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: '#0D0D0D'
          }}>
            {messages.length === 0 && !isLoading && (
              <div style={{ textAlign: 'center', color: '#666666', marginTop: '60px', fontSize: '13px' }}>
                <p style={{ margin: 0, fontWeight: '500' }}>WYSH 브랜드 생산 일정 & 재고 관리를 도와드립니다.</p>
                <p style={{ fontSize: '11px', color: '#444444', marginTop: '6px' }}>궁금하신 생산 이슈를 자유롭게 질문해 보세요.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  padding: '13px 17px',
                  borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  backgroundColor: msg.sender === 'user' ? '#222222' : '#161616',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  border: msg.sender === 'user' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: '10px', color: '#555555', marginTop: '5px', fontWeight: '500' }}>
                  {msg.time}
                </span>
              </div>
            ))}

            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: '#161616',
                borderRadius: '18px',
                color: '#888888',
                fontSize: '13px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span className="spinner" style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#FFFFFF',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite'
                }}></span>
                <span>WYSH AI 분석 및 조언 정리 중...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Button */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#000000',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={triggerBriefing}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: '#181818',
                color: '#DDDDDD',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252525'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#181818'}
            >
              <span>🔄</span>
              <span>실시간 일일 브리핑 업데이트</span>
            </button>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} style={{
            padding: '14px',
            backgroundColor: '#000000',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '10px'
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="생산 일정, 드랍 출시 관련 질문..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: '#111111',
                color: '#FFFFFF',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              style={{
                padding: '12px 18px',
                backgroundColor: inputValue.trim() && !isLoading ? '#FFFFFF' : '#222222',
                color: inputValue.trim() && !isLoading ? '#000000' : '#666666',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '800',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'default',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              전송
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
