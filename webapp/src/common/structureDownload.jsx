import { toXYZ, toPOSCAR, toXSF, toCIF } from "matsci-parse";

import DownloadDropdown, { DownloadIcon } from "./DownloadDropdown";

const formatHandlers = {
  json: {
    label: "JSON",
    extension: "json",
    serialize: (structure) => JSON.stringify(structure, null, 2),
  },
  cif: {
    label: "CIF",
    extension: "cif",
    serialize: toCIF,
  },
  xyz: {
    label: "XYZ",
    extension: "xyz",
    serialize: toXYZ,
  },
  xsf: {
    label: "XSF",
    extension: "xsf",
    serialize: toXSF,
  },
  poscar: {
    label: "VASP",
    extension: "vasp",
    serialize: toPOSCAR,
  },
  // gro: {
  //   label: "GROMACS",
  //   extension: "gro",
  //   serialize: toGRO,
  // },
  // pdb: {
  //   label: "PDB",
  //   extension: "pdb",
  //   serialize: toPDB,
  // },
};

// === Component ===
export default function StructureDownload({ structure, download_formats }) {
  const downloadFormats =
    download_formats ??
    Object.entries(formatHandlers).map(([format, { label }]) => ({
      format,
      label,
    }));

  const items = downloadFormats
    .map(({ format, label }) => {
      const handler = formatHandlers[format];
      if (!handler) {
        console.warn(`Unsupported format: ${format}`);
        return null;
      }
      return {
        key: format,
        label,
        filename: `structure.${handler.extension}`,
        serialize: () => handler.serialize(structure),
      };
    })
    .filter(Boolean);

  return <DownloadDropdown items={items} />;
}

export { DownloadIcon };
