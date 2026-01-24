import type { TopSubtype } from '../lib/types';

interface Props {
  data: TopSubtype[];
}

export function TopSubtypesTable({ data }: Props) {
  return (
    <div className="card table-card">
      <div className="card-title">Top Cause Subtypes (Last 7 Days)</div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Subtype</th>
              <th>Count</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.subtype}>
                <td>{index + 1}</td>
                <td>{item.subtype.replace(/_/g, ' ')}</td>
                <td>{item.count}</td>
                <td>{item.percentage.toFixed(1)}%</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
