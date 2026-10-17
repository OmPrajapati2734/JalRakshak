import React from 'react';

/**
 * JalRakshak UI Primitives & Visual Shell
 * Design Tokens:
 * - Canvas: #F5F7F1
 * - Ink: #17231D
 * - Forest Primary: #23613E
 * - Leaf Positive: #5F9D62
 * - Water Blue: #2E7DA5
 * - Amber Medium Risk: #E7A943
 * - Red High Risk: #C94B42
 * - White Surface: #FFFFFF
 * - Card Radius: 18px (16–20px)
 * - Restrained Soft Shadow: 0 10px 30px rgba(23, 35, 29, 0.08)
 * - Touch Targets: Minimum 44x44 px
 * - System fonts only; no external assets
 */

/**
 * 1. AppShell
 * Wraps view content in a mobile-safe width container with canvas background
 */
export function AppShell({ header, children, className = '', style = {}, ...props }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--canvas)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
        paddingBottom: 'var(--space-6)',
        ...style
      }}
      className={`w-full ${className}`}
      {...props}
    >
      {header}
      <div className="max-w-xl mx-auto px-4 pt-3 space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * 2. PageHeader
 * Sticky top header with mobile touch-friendly controls
 */
export function PageHeader({
  title,
  subtitle,
  icon = '💧',
  onBack,
  backLabel = 'Back',
  rightActions,
  className = '',
  style = {},
  ...props
}) {
  return (
    <header
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        padding: '10px 16px',
        ...style
      }}
      className={`w-full ${className}`}
      {...props}
    >
      <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              style={{
                minHeight: '44px',
                minWidth: '44px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--canvas)',
                color: 'var(--forest)',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '0 12px'
              }}
              className="focus-visible:ring-2 focus-visible:ring-[var(--forest)]"
            >
              <span>←</span>
              <span>{backLabel}</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              {icon && <span className="text-base" aria-hidden="true">{icon}</span>}
              <h1
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: 'var(--forest)',
                  lineHeight: 1.2
                }}
              >
                {title}
              </h1>
            </div>
            {subtitle && (
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginTop: '2px',
                  lineHeight: 1.2
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {rightActions && (
          <div className="flex items-center gap-1">
            {rightActions}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * 3. Card
 * White cards with restrained shadow and 18px radius
 */
export function Card({
  children,
  className = '',
  style = {},
  as: Component = 'section',
  ...props
}) {
  const cardStyle = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-soft)',
    padding: 'var(--space-2)',
    ...style
  };

  return (
    <Component
      style={cardStyle}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * 4. Button Primitives
 * All buttons guarantee minimum 44x44 px touch targets and visible focus rings
 */
const baseButtonStyle = {
  fontFamily: 'var(--font-sans)',
  minHeight: '44px',
  minWidth: '44px',
  padding: '10px 16px',
  borderRadius: 'var(--radius-md)',
  fontSize: '14px',
  fontWeight: '800',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-1)',
  textDecoration: 'none',
  transition: 'background-color 150ms ease, border-color 150ms ease, opacity 150ms ease',
  outline: 'none'
};

export function PrimaryButton({
  children,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  style = {},
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...baseButtonStyle,
        backgroundColor: 'var(--forest)',
        color: 'var(--surface)',
        border: '1.5px solid var(--forest)',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      className={`focus-visible:ring-2 focus-visible:ring-[var(--forest)] active:opacity-90 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  style = {},
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...baseButtonStyle,
        backgroundColor: 'var(--surface)',
        color: 'var(--forest)',
        border: '1.5px solid var(--forest)',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      className={`focus-visible:ring-2 focus-visible:ring-[var(--forest)] active:bg-[#F5F7F1] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  style = {},
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...baseButtonStyle,
        backgroundColor: 'transparent',
        color: 'var(--ink)',
        border: '1.5px solid var(--border)',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      className={`focus-visible:ring-2 focus-visible:ring-[var(--forest)] hover:border-[var(--forest)] active:bg-[var(--canvas)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Unified Button export for backward compatibility
export function Button({
  variant = 'primary',
  children,
  ...props
}) {
  if (variant === 'secondary') {
    return <SecondaryButton {...props}>{children}</SecondaryButton>;
  }
  if (variant === 'ghost') {
    return <GhostButton {...props}>{children}</GhostButton>;
  }
  return <PrimaryButton {...props}>{children}</PrimaryButton>;
}

/**
 * 5. RiskBadge
 * Never relies on color alone (always icon + text label + high-contrast color)
 */
export function RiskBadge({
  level = 'neutral', // 'high' | 'medium' | 'low' | 'neutral'
  label,
  icon,
  className = '',
  style = {},
  ...props
}) {
  const variantStyles = {
    high: {
      backgroundColor: '#FCECEB',
      color: 'var(--risk)',
      border: '1.5px solid var(--risk)',
      defaultIcon: '⚠️',
      defaultLabel: 'High Risk'
    },
    medium: {
      backgroundColor: '#FDF4E5',
      color: '#8A5810',
      border: '1.5px solid var(--sun)',
      defaultIcon: '⚡',
      defaultLabel: 'Medium Risk'
    },
    low: {
      backgroundColor: '#EBF4ED',
      color: 'var(--forest)',
      border: '1.5px solid var(--leaf)',
      defaultIcon: '✓',
      defaultLabel: 'Optimal Moisture'
    },
    neutral: {
      backgroundColor: 'var(--canvas)',
      color: 'var(--muted)',
      border: '1px solid var(--border)',
      defaultIcon: '•',
      defaultLabel: 'Info'
    }
  }[level] || {};

  const displayIcon = icon !== undefined ? icon : variantStyles.defaultIcon;
  const displayLabel = label !== undefined ? label : variantStyles.defaultLabel;

  return (
    <span
      style={{
        fontFamily: 'var(--font-sans)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        borderRadius: 'var(--radius-full)',
        fontSize: '12px',
        fontWeight: '800',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        backgroundColor: variantStyles.backgroundColor,
        color: variantStyles.color,
        border: variantStyles.border,
        ...style
      }}
      className={className}
      {...props}
    >
      {displayIcon && <span aria-hidden="true">{displayIcon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
}

// Backward compatible Badge export
export function Badge({ variant = 'neutral', children, ...props }) {
  return <RiskBadge level={variant} label={children} {...props} />;
}

/**
 * 6. StatusIcon with visible text label
 * Respects accessibility: never icon or color alone
 */
export function StatusIcon({
  status = 'optimal', // 'optimal' | 'warning' | 'critical' | 'info'
  label,
  className = '',
  style = {}
}) {
  const meta = {
    optimal: { icon: '✓', color: 'var(--forest)', bg: '#EBF4ED' },
    warning: { icon: '⚡', color: '#8A5810', bg: '#FDF4E5' },
    critical: { icon: '⚠️', color: 'var(--risk)', bg: '#FCECEB' },
    info: { icon: 'ℹ️', color: 'var(--water)', bg: '#EBF3F8' }
  }[status] || { icon: '•', color: 'var(--muted)', bg: 'var(--canvas)' };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: '700',
        color: meta.color,
        ...style
      }}
      className={className}
    >
      <span
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: meta.bg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: '900'
        }}
        aria-hidden="true"
      >
        {meta.icon}
      </span>
      <span>{label}</span>
    </div>
  );
}

/**
 * 7. LoadingSkeleton
 * Subtle pulsing skeleton placeholder with restrained animation
 */
export function LoadingSkeleton({
  width = '100%',
  height = '24px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--border)',
        ...style
      }}
      className={`animate-pulse ${className}`}
      {...props}
    />
  );
}

/**
 * 8. EmptyState
 * Polished, calm empty state with large icon and title
 */
export function EmptyState({
  title,
  description,
  icon = '🌱',
  action = null,
  className = '',
  style = {},
  ...props
}) {
  return (
    <Card
      style={{
        textAlign: 'center',
        padding: 'var(--space-4)',
        ...style
      }}
      className={className}
      {...props}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }} aria-hidden="true">
        {icon}
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '15px',
          fontWeight: '800',
          color: 'var(--ink)',
          marginBottom: '6px'
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            color: 'var(--muted)',
            lineHeight: 1.5,
            maxWidth: '360px',
            margin: '0 auto'
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          {action}
        </div>
      )}
    </Card>
  );
}

/**
 * 9. Modal
 * Accessible dialog modal with backdrop blur-xs, close handling, and 44px touch targets
 */
export function Modal({
  isOpen,
  onClose,
  title,
  icon = '💧',
  children,
  footer,
  maxWidth = 'max-w-md',
  ariaLabelledBy = 'modal-title'
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-soft)'
        }}
        className={`w-full ${maxWidth} p-5 space-y-4`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <h3
            id={ariaLabelledBy}
            style={{
              fontSize: '16px',
              fontWeight: 900,
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {icon && <span aria-hidden="true">{icon}</span>}
            <span>{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--muted)',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none'
            }}
            className="hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--forest)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
