export const getLatestDisplayValue = ({
  currentValue,
  previousValue,
}: {
  currentValue?: string | null;
  previousValue?: string | null;
}) => {

  if (
    currentValue &&
    previousValue &&
    currentValue !== previousValue
  ) {
    return `${currentValue} (previously ${previousValue})`;
  }

  return currentValue || previousValue || "";
};