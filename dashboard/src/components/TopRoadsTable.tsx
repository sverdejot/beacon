import type { TopRoad } from '../lib/types';

interface Props {
  data: TopRoad[];
}

export function TopRoadsTable({ data }: Props) {
  return (
    <div className="card table-card">
      <div className="card-title">Top Roads (Last 7 Days)</div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Road</th>
              <th>Name</th>
              <th>Incidents</th>
            </tr>
          </thead>
          <tbody>
            {data.map((road, index) => (
              <tr key={road.road_number}>
                <td>{index + 1}</td>
                <td>{road.road_number}</td>
                <td>{road.road_name || '-'}</td>
                <td>{road.count}</td>
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
