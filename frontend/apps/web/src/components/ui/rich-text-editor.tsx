"use client";

import * as React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Image,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  List,
  ListOrdered,
  Maximize2,
  Quote,
  Redo2,
  Smile,
  Strikethrough,
  Table2,
  Type,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommandButton = {
  label: string;
  command: string;
  value?: string;
  icon: React.ReactNode;
  disabled?: boolean;
};

export interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  className?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

export function RichTextEditor({
  id,
  value,
  onChange,
  minHeight = 180,
  className,
  disabled = false,
  "aria-invalid": ariaInvalid,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = React.useState(false);

  React.useEffect(() => {
    const node = editorRef.current;
    if (node && node.innerHTML !== value) {
      node.innerHTML = value || "";
    }
  }, [value]);

  function emitChange() {
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function run(command: string, commandValue?: string) {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function promptLink() {
    const url = window.prompt("Link URL");
    if (url) run("createLink", url);
  }

  function promptImage() {
    const url = window.prompt("Image URL");
    if (url) run("insertImage", url);
  }

  const commands: CommandButton[] = [
    { label: "Bold", command: "bold", icon: <Bold className="h-4 w-4" /> },
    { label: "Italic", command: "italic", icon: <Italic className="h-4 w-4" /> },
    { label: "Underline", command: "underline", icon: <Underline className="h-4 w-4" /> },
    { label: "Strikethrough", command: "strikeThrough", icon: <Strikethrough className="h-4 w-4" /> },
    { label: "Text color", command: "foreColor", value: "#174F7A", icon: <Type className="h-4 w-4" /> },
    { label: "Highlight", command: "backColor", value: "#FFF1C7", icon: <Type className="h-4 w-4 rounded bg-warning/20" /> },
    { label: "Align left", command: "justifyLeft", icon: <AlignLeft className="h-4 w-4" /> },
    { label: "Align center", command: "justifyCenter", icon: <AlignCenter className="h-4 w-4" /> },
    { label: "Align right", command: "justifyRight", icon: <AlignRight className="h-4 w-4" /> },
    { label: "Justify", command: "justifyFull", icon: <AlignJustify className="h-4 w-4" /> },
    { label: "Undo", command: "undo", icon: <Undo2 className="h-4 w-4" /> },
    { label: "Redo", command: "redo", icon: <Redo2 className="h-4 w-4" /> },
    { label: "Numbered list", command: "insertOrderedList", icon: <ListOrdered className="h-4 w-4" /> },
    { label: "Bulleted list", command: "insertUnorderedList", icon: <List className="h-4 w-4" /> },
    { label: "Outdent", command: "outdent", icon: <IndentDecrease className="h-4 w-4" /> },
    { label: "Indent", command: "indent", icon: <IndentIncrease className="h-4 w-4" /> },
    { label: "Remove link", command: "unlink", icon: <Unlink className="h-4 w-4" /> },
    { label: "Table placeholder", command: "insertHTML", value: "<table><tbody><tr><td>Cell</td><td>Cell</td></tr></tbody></table>", icon: <Table2 className="h-4 w-4" /> },
    { label: "Horizontal rule", command: "insertHorizontalRule", icon: <Eraser className="h-4 w-4" /> },
    { label: "Smiley", command: "insertText", value: ":)", icon: <Smile className="h-4 w-4" /> },
    { label: "Special character", command: "insertText", value: "Omega", icon: <span className="text-xs font-bold">Om</span> },
    { label: "Quote", command: "formatBlock", value: "blockquote", icon: <Quote className="h-4 w-4" /> },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-background shadow-sm",
        ariaInvalid && "border-error",
        fullscreen && "fixed inset-4 z-[60] bg-background",
        className
      )}
    >
      <div className="flex min-h-12 flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-2 py-2">
        <ToolbarSelect label="Styles" disabled={disabled} onChange={(value) => run("formatBlock", value)}>
          <option value="div">Styles</option>
          <option value="p">Normal</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
        </ToolbarSelect>
        <ToolbarSelect label="Format" disabled={disabled} onChange={(value) => run("fontSize", value)}>
          <option value="">Format</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
        </ToolbarSelect>
        <ToolbarSeparator />
        {commands.slice(0, 10).map((button) => (
          <ToolbarButton key={button.label} button={button} disabled={disabled} onRun={run} />
        ))}
        <ToolbarSeparator />
        {commands.slice(10, 16).map((button) => (
          <ToolbarButton key={button.label} button={button} disabled={disabled} onRun={run} />
        ))}
        <ToolbarSeparator />
        <button type="button" className="toolbar-button" disabled={disabled} title="Link" onClick={promptLink}>
          <Link className="h-4 w-4" />
        </button>
        <ToolbarButton button={commands[16]} disabled={disabled} onRun={run} />
        <button type="button" className="toolbar-button" disabled={disabled} title="Image" onClick={promptImage}>
          <Image className="h-4 w-4" />
        </button>
        {commands.slice(17).map((button) => (
          <ToolbarButton key={button.label} button={button} disabled={disabled} onRun={run} />
        ))}
        <button type="button" className="toolbar-button ml-1" title="Fullscreen" onClick={() => setFullscreen((current) => !current)}>
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-invalid={ariaInvalid}
        contentEditable={!disabled}
        suppressContentEditableWarning
        className="rich-text-content w-full overflow-y-auto px-4 py-3 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        style={{ minHeight: fullscreen ? "calc(100vh - 8rem)" : minHeight }}
        onInput={emitChange}
        onBlur={emitChange}
      />
    </div>
  );
}

function ToolbarButton({
  button,
  disabled,
  onRun,
}: {
  button: CommandButton;
  disabled?: boolean;
  onRun: (command: string, value?: string) => void;
}) {
  return (
    <button
      type="button"
      className="toolbar-button"
      disabled={disabled || button.disabled}
      title={button.label}
      onClick={() => onRun(button.command, button.value)}
    >
      {button.icon}
    </button>
  );
}

function ToolbarSelect({
  label,
  disabled,
  children,
  onChange,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      disabled={disabled}
      className="h-8 min-w-28 border-0 bg-transparent px-2 text-label outline-none hover:bg-muted"
      defaultValue=""
      onChange={(event) => {
        if (event.target.value) onChange(event.target.value);
        event.currentTarget.value = "";
      }}
    >
      {children}
    </select>
  );
}

function ToolbarSeparator() {
  return <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />;
}

