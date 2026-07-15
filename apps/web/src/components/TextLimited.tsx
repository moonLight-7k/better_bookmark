interface TextLimitedProps {
  text: string;
  maxLength: number;
}

export default function TextLimited({ text, maxLength }: TextLimitedProps) {
  // If the text is shorter than or equal to the maxLength, return the original text
  // eslint-disable-next-line react/prop-types
  if (text.length <= maxLength) {
    return <span>{text}</span>;
  }

  // Otherwise, truncate the text and add an ellipsis (...) at the end
  // eslint-disable-next-line react/prop-types
  const truncatedText = text.substring(0, maxLength) + "...";

  return <span title={text}>{truncatedText}</span>;
}
