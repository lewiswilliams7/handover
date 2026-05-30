type Row = { feature: string; handover: string | boolean; competitor: string | boolean };

export function CompareTable({
  rows,
  competitorName,
}: {
  rows: Row[];
  competitorName: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
      <table className="w-full text-[15px]">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="px-6 py-4 text-left font-medium text-white/50">Feature</th>
            <th className="px-6 py-4 text-left font-semibold text-white">Handover</th>
            <th className="px-6 py-4 text-left font-medium text-white/70">{competitorName}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0">
              <td className="px-6 py-4 text-white/70">{row.feature}</td>
              <td className="px-6 py-4 text-white">
                {typeof row.handover === "boolean" ? (row.handover ? "✓" : "✗") : row.handover}
              </td>
              <td className="px-6 py-4 text-white/50">
                {typeof row.competitor === "boolean"
                  ? row.competitor
                    ? "✓"
                    : "✗"
                  : row.competitor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
