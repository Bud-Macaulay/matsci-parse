const overlineStyle = {
  display: "inline-block",
  position: "relative",
};

const overlineAdjustmentStyle = {
  position: "absolute",
  top: "0.15em",
  left: 0,
  right: 0,
  borderTop: "0.1em solid black",
  height: 0,
  zIndex: 1,
};

export function formatSpaceGroupSymbol(params) {
  /*
   * Note: there is no case where both subscript and overline need
   * to be applied to the same number.
   */
  let nextIsSub = false;
  let nextIsNegative = false;
  return (
    <span>
      {params.split("").map((v, index) => {
        if (v == "-") {
          nextIsNegative = true;
          return null;
        }
        if (v == "_") {
          nextIsSub = true;
          return null;
        }
        if (nextIsNegative) {
          nextIsNegative = false;
          return (
            <span style={overlineStyle} key={index}>
              <span style={overlineAdjustmentStyle} />
              {v}
            </span>
          );
        }
        if (nextIsSub) {
          nextIsSub = false;
          return <sub key={index}>{v}</sub>;
        }
        return v;
      })}
    </span>
  );
}
