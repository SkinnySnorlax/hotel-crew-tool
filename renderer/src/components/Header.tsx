type Props = { title: string };

export function Header({ title }: Props) {
  return (
    <div style={{ padding: 16, borderBottom: '1px solid #ddd' }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
    </div>
  );
}
