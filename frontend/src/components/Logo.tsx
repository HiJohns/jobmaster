import React from 'react';

interface LogoProps {
  size?: number;
  theme?: 'light' | 'dark'; // light 用于深色背景(白图)，dark 用于白色背景(蓝图)
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 40, theme = 'dark', showText = true }) => {
  const iconColor = theme === 'light' ? '#ffffff' : '#0033FF';
  const textColor = theme === 'light' ? '#ffffff' : '#001529';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 外齿轮轮廓，使用更粗更圆润的线条 */}
        <path 
          d="M50 10C53 10 55 12 56 15L58 20C61 21 64 23 67 25L72 23C75 22 78 23 79 26L83 33C84 36 83 39 81 40L77 45C78 48 78 52 77 55L81 60C83 61 84 64 83 67L79 74C78 77 75 78 72 77L67 75C64 77 61 79 58 80L56 85C55 88 53 90 50 90C47 90 45 88 44 85L42 80C39 79 36 77 33 75L28 77C25 78 22 77 21 74L17 67C16 64 17 61 19 60L23 55C22 52 22 48 23 45L19 40C17 39 16 36 17 33L21 26C22 23 25 22 28 23L33 25C36 23 39 21 42 20L44 15C45 12 47 10 50 10Z" 
          stroke={iconColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 内部圆形区域打底，为了对勾显示清晰 */}
        <circle cx="50" cy="50" r="24" fill={theme === 'light' ? 'rgba(255,255,255,0.1)' : 'transparent'} />
        {/* 绿色对勾，粗细一致 */}
        <path 
          d="M38 52L46 60L64 42" 
          stroke="#00B578" 
          strokeWidth="10" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      
      {showText && (
        <span style={{ 
          fontSize: Math.max(16, size * 0.45), 
          fontWeight: 500, // font-medium
          color: textColor,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '1px',
          lineHeight: 1
        }}>
          工单匠
        </span>
      )}
    </div>
  );
};

export default Logo;
