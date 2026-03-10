/**
 * ReadOnly Watermark Component
 * Ghost Overlay for impersonation mode
 * 
 * Architecture Principle:
 * When isImpersonated is true in useAuthStore, this watermark covers the entire
 * site with a semi-transparent overlay to prevent confusion during testing.
 * 
 * Usage: Place this component at the root layout level
 */

import React from 'react'
import { useAuthStore } from '../store/useAuthStore'

interface ReadOnlyWatermarkProps {
  /** Children components to wrap */
  children: React.ReactNode
}

/**
 * ReadOnly Watermark Wrapper Component
 * 
 * Wraps children with a watermark overlay when in impersonation mode.
 * This prevents accidental modifications when viewing data as another role.
 */
function ReadOnlyWatermark({ children }: ReadOnlyWatermarkProps) {
  const { isImpersonated } = useAuthStore()

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {children}
      
      {isImpersonated && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Watermark pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 100px,
                  rgba(255, 0, 0, 0.03) 100px,
                  rgba(255, 0, 0, 0.03) 200px
                )
              `,
            }}
          />
          
          {/* Corner badge */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-30deg)',
              backgroundColor: 'rgba(255, 0, 0, 0.15)',
              color: 'rgba(255, 0, 0, 0.6)',
              padding: '20px 60px',
              fontSize: '24px',
              fontWeight: 'bold',
              border: '3px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '8px',
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10000,
            }}
          >
            只读模式
          </div>

          {/* Top banner */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '40px',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              borderBottom: '2px solid rgba(255, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 0, 0, 0.8)',
              fontSize: '14px',
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 10001,
            }}
          >
            当前处于只读模拟模式，所有修改操作已被禁用
          </div>
        </div>
      )}
    </div>
  )
}

export default ReadOnlyWatermark
