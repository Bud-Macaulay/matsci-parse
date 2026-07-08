// import { baseButtonStyle } from "../../styles/buttonStyles";
// import { textNormal } from "../../styles/textStyles";

import { toPOSCAR } from "matsci-parse";

export default function QEInputButton({ structure }) {
  const DOMAIN = "https://qeinputgenerator.materialscloud.io";

  const handleClick = async () => {
    if (!structure) {
      alert("No CIF data available");
      return;
    }

    // Open immediately to avoid popup blocking stuff...
    const popup = window.open("", "_blank");

    try {
      const formData = new FormData();
      formData.append("fileformat", "vasp-ase");
      formData.append(
        "structurefile",
        new Blob([toPOSCAR(structure)], { type: "text/plain;charset=utf-8" }),
        "structure.vasp",
      );

      const response = await fetch(`${DOMAIN}/compute/upload_structure/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const json = await response.json();

      if (json.redirect) {
        // channel the redirect into the popup window...
        popup.location = `${DOMAIN}${json.redirect}`;
      } else {
        popup.close();
        alert("Unexpected response from server");
      }
    } catch (err) {
      console.error(err);
      popup.close();
      alert("Failed to upload structure.");
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!structure}
      title="Use the chosen structure in the QE Input Generator Tool"
      className="px-2.5 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 hover:cursor-pointer transition shadow-sm"
      //   className={`${baseButtonStyle} ${textNormal}`}
    >
      Use in QE Input Generator
    </button>
  );
}
