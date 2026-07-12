type SectionCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, eyebrow, children }: SectionCardProps) {
  return (
    <section className="panel">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="panel__header">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}