export default function BaseTable({
  title,
  headers,
  children,
  maxHeight = "150px",
}) {
  return (
    <div className="bg-white rounded-md border border-b-0 overflow-hidden">
      <div className="px-3 py-2 border-b bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {title}
        </h3>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full text-xs border-separate border-spacing-0">
          {headers && (
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-2 py-1 text-left border-b-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
