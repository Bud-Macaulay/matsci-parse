import { loadGthElement } from "../../../../helpers/external";

/** Real Hydrogen GTH-PBE entry from the submodule. */
export const realHGthPbe = loadGthElement("H");

/** Real Helium GTH-PBE entry from the submodule. */
export const realHeGthPbe = loadGthElement("He");

/** Real Carbon GTH-PBE entry from the submodule. */
export const realCGthPbe = loadGthElement("C");

/** Real Nitrogen GTH-PBE entry from the submodule. */
export const realNGthPbe = loadGthElement("N");

/** Real Oxygen GTH-PBE entry from the submodule. */
export const realOGthPbe = loadGthElement("O");

/** Multi-element GTH file: H, He, C joined from individual files. */
export const realMultiGth = [realHGthPbe, realHeGthPbe, realCGthPbe].join("\n#\n");
