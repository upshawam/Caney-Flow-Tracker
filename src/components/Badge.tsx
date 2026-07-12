type BadgeProps = {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'danger';
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}