import { useState, useMemo } from "react";
import { getDistancesMatrix } from "matsci-parse";
import Modal from "../common/Modal";

const MAX_INLINE = 30;

function distanceColor(d, maxD) {
  if (d === 0) return "bg-gray-100";
  const t = Math.min(d / maxD, 1);
  const r = Math.round(59 + t * 196);
  const g = Math.round(130 - t * 80);
  const b = Math.round(246 - t * 200);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function DistanceMatrixPanel({ structure }) {
  const [open, setOpen] = useState(false);
  const [matrix, setMatrix] = useState(null);

  const siteLabels = useMemo(
    () => structure.sites.map((s, i) => `${i}·${s.species.symbol}`),
    [structure],
  );

  const handleOpen = () => {
    const n = structure.sites.length;

    if (n > 150) {
      if (
        !window.confirm(
          `Structure has ${n} atoms. Distance matrix will be ${n}×${n}. Continue?`,
        )
      ) {
        return;
      }
    }

    setMatrix(getDistancesMatrix(structure));
    setOpen(true);
  };

  const maxD = useMemo(() => {
    if (!matrix) return 1;
    let mx = 0;
    for (const row of matrix) {
      for (let j = 0; j < row.length; j++) {
        if (row[j] > mx) mx = row[j];
      }
    }
    return mx || 1;
  }, [matrix]);

  const n = structure.sites.length;
  const showFull = n <= MAX_INLINE;

  return (
    <>
      <button onClick={handleOpen} title="Show pairwise interatomic distances as a heatmap" className="buttonSimple blue w-full">
        See Distance Matrix
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Distance Matrix"
        maxWidth="max-w-6xl"
      >
        {matrix &&
          (showFull ? (
            <div className="overflow-auto max-h-[75vh]">
              <table className="text-[10px] border-separate border-spacing-0 font-mono">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-gray-100 px-1 py-0.5 border-b border-r z-10" />
                    {siteLabels.map((lbl, j) => (
                      <th
                        key={j}
                        className="px-1 py-0.5 border-b bg-gray-100 whitespace-nowrap"
                      >
                        {lbl}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="sticky left-0 bg-gray-100 px-1 py-0.5 border-r font-semibold z-10 whitespace-nowrap">
                        {siteLabels[i]}
                      </td>
                      {Array.from(row).map((d, j) => (
                        <td
                          key={j}
                          className="px-1 py-0.5 text-center border whitespace-nowrap"
                          style={{
                            backgroundColor: distanceColor(d, maxD),
                            color: d === 0 ? "#9ca3af" : "#1f2937",
                          }}
                          title={`${siteLabels[i]} ↔ ${siteLabels[j]}: ${d.toFixed(4)} Å`}
                        >
                          {d === 0 ? "0" : d.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              <p className="mb-2">
                {n}×{n} matrix — showing upper triangle:
              </p>
              <div className="overflow-auto max-h-[60vh]">
                <table className="text-[10px] border-separate border-spacing-0 font-mono">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-gray-100 px-1 py-0.5 border-b border-r z-10" />
                      {siteLabels.map((lbl, j) => (
                        <th
                          key={j}
                          className="px-1 py-0.5 border-b bg-gray-100 whitespace-nowrap"
                        >
                          {lbl}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="sticky left-0 bg-gray-100 px-1 py-0.5 border-r font-semibold z-10 whitespace-nowrap">
                          {siteLabels[i]}
                        </td>
                        {Array.from(row).map((d, j) =>
                          j < i ? (
                            <td
                              key={j}
                              className="px-1 py-0.5 border bg-gray-50"
                            />
                          ) : (
                            <td
                              key={j}
                              className="px-1 py-0.5 text-center border whitespace-nowrap"
                              style={{
                                backgroundColor: distanceColor(d, maxD),
                                color: d === 0 ? "#9ca3af" : "#1f2937",
                              }}
                              title={`${siteLabels[i]} ↔ ${siteLabels[j]}: ${d.toFixed(4)} Å`}
                            >
                              {d === 0 ? "0" : d.toFixed(3)}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </Modal>
    </>
  );
}
