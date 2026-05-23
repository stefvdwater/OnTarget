export default function AfdrukkenTab(): JSX.Element {
  return (
    <div className="card" style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 6, fontWeight: 600 }}>
        Afdrukken
      </div>
      <div style={{ color: 'var(--muted)', maxWidth: 380, margin: '0 auto' }}>
        Hier komt de print-pagina voor doelbordjes, deelnemerslijsten en de gildeoverzichten.
      </div>
    </div>
  )
}
