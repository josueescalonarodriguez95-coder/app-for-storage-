/*
  Los seis pictogramas del menú, dibujados a mano en SVG (trazo 1,9px, rejilla 24px),
  tal como vienen en el prototipo aprobado (Bodega Ramos iPad.dc.html, const ICONS).
*/

export type IconName = 'scan' | 'inv' | 'entrada' | 'salida' | 'mud' | 'etq'

const ICON_PATHS: Record<IconName, string> = {
  scan: 'M3 8V5.6A2.6 2.6 0 015.6 3H8;M21 8V5.6A2.6 2.6 0 0018.4 3H16;M3 16v2.4A2.6 2.6 0 005.6 21H8;M21 16v2.4A2.6 2.6 0 0118.4 21H16;M3 12h18',
  inv: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  entrada: 'M12 3v12;M6.5 10.5L12 16l5.5-5.5;M4 21h16',
  salida: 'M12 21V9;M6.5 13.5L12 8l5.5 5.5;M4 3h16',
  mud: 'M2.5 7.5A1.5 1.5 0 014 6h8v10H2.5zM12 10h4.5l4 4v2H12;M6.5 19a2 2 0 100-4 2 2 0 000 4;M17 19a2 2 0 100-4 2 2 0 000 4',
  etq: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14.5 14.5h3v3h-3;M20 14.5v3;M14.5 20H20',
}

export function NavIcon({ name, color, size = 21 }: { name: IconName; color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[name].split(';').map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
