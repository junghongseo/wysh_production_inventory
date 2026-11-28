// AI 매니저 답변(마크다운 비슷한 텍스트)을 채팅 말풍선용 HTML 로 바꾼다.
// 답변에는 팀원이 입력한 메모·제품명 등이 섞일 수 있으므로, 서식을 입히기 전에 HTML 을 먼저 이스케이프한다.

export const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const formatChatMessage = (text) => {
  if (!text) return { __html: '' };

  let cleaned = escapeHtml(text);

  // Codeblocks ```...```
  cleaned = cleaned.replace(/```([\s\S]*?)```/g, '<pre style="background:#181818; padding:10px 14px; border-radius:10px; font-family:monospace; font-size:12.5px; border:1px solid rgba(255,255,255,0.12); margin:10px 0; overflow-x:auto; color:#E2E8F0;">$1</pre>');

  // Headers ###, ##, #
  cleaned = cleaned.replace(/^###\s*(.*$)/gim, '<div style="font-weight: 800; font-size: 1.05em; margin-top: 14px; margin-bottom: 6px; color: #38BDF8; letter-spacing: -0.2px;">$1</div>');
  cleaned = cleaned.replace(/^##\s*(.*$)/gim, '<div style="font-weight: 800; font-size: 1.12em; margin-top: 16px; margin-bottom: 8px; color: #FFFFFF; letter-spacing: -0.2px;">$1</div>');
  cleaned = cleaned.replace(/^#\s*(.*$)/gim, '<div style="font-weight: 700; font-size: 1.02em; margin-top: 12px; margin-bottom: 6px; color: #FB923C;">$1</div>');

  // Bold **text** -> clean bold without asterisks
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFFFFF; font-weight: 700;">$1</strong>');

  // Italic *text* -> clean text without asterisks
  cleaned = cleaned.replace(/\*(.*?)\*/g, '<span style="color: rgba(255,255,255,0.95);">$1</span>');

  // Inline code `code`
  cleaned = cleaned.replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:0.9em; color:#38BDF8;">$1</code>');

  // Bullet list items (* or -) -> clean dot
  cleaned = cleaned.replace(/^\s*[\*\-]\s+/gim, '• ');

  // Horizontal rules ---
  cleaned = cleaned.replace(/^---\s*$/gim, '<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 14px 0;" />');

  // Clean up any lingering loose asterisks
  cleaned = cleaned.replace(/\*/g, '');

  // Convert newline characters \n into <br /> so line breaks are preserved in HTML
  cleaned = cleaned.replace(/\n/g, '<br />');

  return { __html: cleaned };
};
