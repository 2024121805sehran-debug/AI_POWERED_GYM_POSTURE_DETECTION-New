import React from "react";

// Reusable Glass Card Component
export function GlassCard({ children, className = "", hover = false, ...props }) {
  return (
    <div
      className={`bg-glass-white backdrop-blur-glass border border-slate-200/50 shadow-glass rounded-glass ${hover ? "hover:shadow-glass-hover hover:scale-[1.02] transition-all duration-300" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Floating Card with 3D effect
export function FloatingCard({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white shadow-float rounded-glass-lg border border-slate-100/50 transform hover:scale-[1.02] hover:shadow-float transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Stat Card
export function StatCard({ icon, label, value, trend, className = "" }) {
  return (
    <div className={`bg-white rounded-glass border border-slate-100/50 shadow-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? "text-success-600" : "text-error-600"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

// Glass Button
export function GlassButton({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/25",
    secondary: "bg-white hover:bg-slate-50 text-text-primary border border-slate-200 shadow-card",
    danger: "bg-error-500 hover:bg-error-600 text-white shadow-lg shadow-error-500/25",
    ghost: "bg-transparent hover:bg-slate-100 text-text-primary",
  };

  return (
    <button
      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Section Header
export function SectionHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
          {subtitle && <p className="text-text-muted mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

// Badge
export function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    primary: "bg-brand-100 text-brand-700",
    success: "bg-success-100 text-success-700",
    warning: "bg-warning-100 text-warning-700",
    error: "bg-error-100 text-error-700",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Glass Modal
export function GlassModal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-glass-lg shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-text-muted transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
