import React from 'react';

interface LogoProps {
  size?: number;
  theme?: 'light' | 'dark';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 40, theme = 'dark', showText = true }) => {
  const textColor = theme === 'dark' ? '#001529' : '#ffffff';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M50 15L54.5 25H65.5L70 15L78 18L75 28.5L84 35L94 32L97 40L87 45.5V54.5L97 60L94 68L84 65L75 71.5L78 82L70 85L65.5 75H54.5L50 85L42 82L45 71.5L36 65L26 68L23 60L33 54.5V45.5L23 40L26 32L36 35L45 28.5L42 18L50 15Z" 
          fill="#0033FF"
        />
        <circle cx="50" cy="50" r="18" fill={theme === 'dark' ? 'white' : '#001529'} />
        <path 
          d="M35 50L45 60L75 30" 
          stroke="#00CC66" 
          strokeWidth="10" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      
      {showText && (
        <span style={{ 
          fontSize: size * 0.5, 
          fontWeight: 'bold', 
          color: textColor,
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          letterSpacing: '1px'
        }}>
          工单匠
        </span>
      )}
    </div>
  );
};

export default Logo;
