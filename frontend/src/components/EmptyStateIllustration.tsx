import React from 'react';

interface EmptyStateIllustrationProps {
  message?: string;
}

const EmptyStateIllustration: React.FC<EmptyStateIllustrationProps> = ({ 
  message = '当前节点暂无工单，点击右侧按钮发起新任务'
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
    }}>
      <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 维修清单背景 */}
        <rect x="40" y="20" width="120" height="100" rx="8" fill="#f5f5f5" stroke="#d9d9d9" strokeWidth="2"/>
        
        {/* 清单线条 */}
        <line x1="60" y1="45" x2="140" y2="45" stroke="#bfbfbf" strokeWidth="2" strokeLinecap="round"/>
        <line x1="60" y1="60" x2="140" y2="60" stroke="#bfbfbf" strokeWidth="2" strokeLinecap="round"/>
        <line x1="60" y1="75" x2="140" y2="75" stroke="#bfbfbf" strokeWidth="2" strokeLinecap="round"/>
        <line x1="60" y1="90" x2="110" y2="90" stroke="#bfbfbf" strokeWidth="2" strokeLinecap="round"/>
        
        {/* 对勾图标 */}
        <circle cx="70" cy="45" r="6" fill="#52c41a"/>
        <path d="M67 45L69 47L73 42" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        
        {/* 工具图标 - 扳手 */}
        <path d="M150 100L160 90L165 95L155 105L150 100Z" fill="#0033FF"/>
        <circle cx="160" cy="90" r="4" fill="#0033FF"/>
        
        {/* 工具图标 - 螺丝刀 */}
        <rect x="175" y="85" width="15" height="3" rx="1.5" fill="#8c8c8c" transform="rotate(-45 175 85)"/>
        <rect x="180" y="80" width="3" height="15" rx="1.5" fill="#8c8c8c"/>
        
        {/* 星号装饰 */}
        <path d="M30 30L32 34L36 34L33 37L34 41L30 38L26 41L27 37L24 34L28 34L30 30Z" fill="#FFD700" opacity="0.7"/>
      </svg>
      
      <div style={{
        color: '#666',
        fontSize: '14px',
        marginTop: '20px',
        textAlign: 'center',
        lineHeight: '1.6',
        maxWidth: '300px',
      }}>
        {message}
      </div>
    </div>
  );
};

export default EmptyStateIllustration;
