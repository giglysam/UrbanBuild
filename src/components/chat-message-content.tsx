import { cn } from "@/lib/utils";

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "p"; text: string };

function parseChatMarkdown(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length) {
      blocks.push({ type: "ul", items: [...bulletBuffer] });
      bulletBuffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushBullets();
      blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushBullets();
      blocks.push({ type: "h3", text: trimmed.slice(4).trim() });
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bulletBuffer.push(trimmed.slice(2).trim());
      continue;
    }

    flushBullets();
    blocks.push({ type: "p", text: trimmed });
  }

  flushBullets();
  return blocks;
}

/** Renders assistant chat markdown (headings + bullets) for readable layout. */
export function ChatMessageContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseChatMarkdown(content);

  if (!blocks.length) {
    return <span className={className}>{content}</span>;
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h3 key={i} className="mt-1 text-sm font-semibold tracking-tight first:mt-0">
                {block.text}
              </h3>
            );
          case "h3":
            return (
              <h4 key={i} className="text-sm font-medium text-foreground/90">
                {block.text}
              </h4>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5 text-sm">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "p":
            return (
              <p key={i} className="text-sm leading-relaxed">
                {block.text}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
