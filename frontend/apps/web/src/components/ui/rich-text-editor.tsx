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
import { sanitizeHtml } from "@/lib/html";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InlineTag = "strong" | "em" | "u" | "s" | "span";
type BlockTag = "p" | "h2" | "h3" | "blockquote";
type AlignValue = "left" | "center" | "right" | "justify";

type ToolbarAction = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
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
  onImageUpload?: (file: File) => Promise<string>;
}

const SAFE_URL = /^(https?:|mailto:)/i;
const BLOCK_SELECTOR = "p,div,h2,h3,blockquote,li,td,th";

export function RichTextEditor({
  id,
  value,
  onChange,
  minHeight = 180,
  className,
  disabled = false,
  "aria-invalid": ariaInvalid,
  onImageUpload,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const savedRangeRef = React.useRef<Range | null>(null);
  const historyRef = React.useRef<string[]>([sanitizeHtml(value)]);
  const historyIndexRef = React.useRef(0);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const [imageBusy, setImageBusy] = React.useState(false);

  React.useEffect(() => {
    const node = editorRef.current;
    const safeValue = sanitizeHtml(value);
    if (node && node.innerHTML !== safeValue) {
      node.innerHTML = safeValue;
      historyRef.current = [safeValue];
      historyIndexRef.current = 0;
    }
  }, [value]);

  function editorContains(node: Node | null) {
    return !!node && !!editorRef.current?.contains(node);
  }

  function currentRange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!editorContains(range.commonAncestorContainer)) return null;
    return range;
  }

  function saveSelection() {
    const range = currentRange();
    savedRangeRef.current = range ? range.cloneRange() : null;
  }

  function restoreSelection() {
    editorRef.current?.focus();
    const range = savedRangeRef.current;
    if (!range) return null;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return range;
  }

  function moveCaretAfter(node: Node) {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();
  }

  function recordChange() {
    const node = editorRef.current;
    if (!node) return;
    const safe = sanitizeHtml(node.innerHTML);
    if (node.innerHTML !== safe) node.innerHTML = safe;
    const history = historyRef.current;
    if (history[historyIndexRef.current] !== safe) {
      historyRef.current = history.slice(0, historyIndexRef.current + 1).concat(safe).slice(-80);
      historyIndexRef.current = historyRef.current.length - 1;
    }
    onChange(safe);
  }

  function setHtmlFromHistory(index: number) {
    const html = historyRef.current[index];
    if (html === undefined || !editorRef.current) return;
    editorRef.current.innerHTML = html;
    historyIndexRef.current = index;
    onChange(html);
    editorRef.current.focus();
  }

  function undo() {
    if (historyIndexRef.current > 0) setHtmlFromHistory(historyIndexRef.current - 1);
  }

  function redo() {
    if (historyIndexRef.current < historyRef.current.length - 1) setHtmlFromHistory(historyIndexRef.current + 1);
  }

  function mutateSelection(mutator: (range: Range) => Node | null) {
    if (disabled) return;
    const range = restoreSelection() ?? currentRange();
    if (!range) {
      editorRef.current?.focus();
      return;
    }
    const inserted = mutator(range);
    if (inserted) moveCaretAfter(inserted);
    recordChange();
  }

  function wrapInline(tag: InlineTag, attrs?: Record<string, string>) {
    mutateSelection((range) => {
      const element = document.createElement(tag);
      Object.entries(attrs ?? {}).forEach(([key, val]) => element.setAttribute(key, val));
      if (range.collapsed) {
        element.appendChild(document.createTextNode("\u200b"));
      } else {
        element.appendChild(range.extractContents());
      }
      range.deleteContents();
      range.insertNode(element);
      return element;
    });
  }

  function formatBlock(tag: BlockTag) {
    mutateSelection((range) => {
      const block = nearestBlock(range.startContainer);
      if (block && block !== editorRef.current) {
        const replacement = document.createElement(tag);
        replacement.innerHTML = block.innerHTML || "<br>";
        block.replaceWith(replacement);
        return replacement;
      }
      const wrapper = document.createElement(tag);
      wrapper.appendChild(range.extractContents());
      if (!wrapper.textContent?.trim()) wrapper.appendChild(document.createElement("br"));
      range.deleteContents();
      range.insertNode(wrapper);
      return wrapper;
    });
  }

  function align(value: AlignValue) {
    mutateSelection((range) => {
      const block = nearestBlock(range.startContainer);
      const target = block && block !== editorRef.current ? block : document.createElement("p");
      target.setAttribute("data-align", value);
      if (!block || block === editorRef.current) {
        target.appendChild(range.extractContents());
        if (!target.textContent?.trim()) target.appendChild(document.createElement("br"));
        range.deleteContents();
        range.insertNode(target);
      }
      return target;
    });
  }

  function insertList(tag: "ul" | "ol") {
    mutateSelection((range) => {
      const text = range.toString();
      const list = document.createElement(tag);
      const rows = text ? text.split(/\r?\n/).filter(Boolean) : [""];
      rows.forEach((row) => {
        const li = document.createElement("li");
        li.textContent = row || "\u200b";
        list.appendChild(li);
      });
      range.deleteContents();
      range.insertNode(list);
      return list;
    });
  }

  function insertHtml(html: string) {
    mutateSelection((range) => {
      const template = document.createElement("template");
      template.innerHTML = sanitizeHtml(html);
      const fragment = template.content;
      const last = fragment.lastChild;
      range.deleteContents();
      range.insertNode(fragment);
      return last;
    });
  }

  function removeLink() {
    mutateSelection((range) => {
      const node = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement;
      const link = node?.closest("a");
      if (!link) return null;
      const text = document.createTextNode(link.textContent ?? "");
      link.replaceWith(text);
      return text;
    });
  }

  function openLinkModal() {
    if (disabled) return;
    saveSelection();
    setLinkUrl("");
    setLinkError(null);
    setLinkOpen(true);
  }

  function submitLink() {
    const url = linkUrl.trim();
    if (!SAFE_URL.test(url)) {
      setLinkError("Use a valid http, https, or mailto link.");
      return;
    }
    mutateSelection((range) => {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      if (range.collapsed) {
        a.textContent = url;
      } else {
        a.appendChild(range.extractContents());
      }
      range.deleteContents();
      range.insertNode(a);
      return a;
    });
    setLinkOpen(false);
  }

  async function uploadImage(file: File) {
    if (!onImageUpload || disabled) return;
    setImageBusy(true);
    try {
      const url = await onImageUpload(file);
      if (SAFE_URL.test(url)) {
        insertHtml(`<a href="${escapeAttr(url)}">Uploaded image: ${escapeHtml(file.name)}</a>`);
      }
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const actions: ToolbarAction[] = [
    { label: "Bold", icon: <Bold className="h-4 w-4" />, onClick: () => wrapInline("strong") },
    { label: "Italic", icon: <Italic className="h-4 w-4" />, onClick: () => wrapInline("em") },
    { label: "Underline", icon: <Underline className="h-4 w-4" />, onClick: () => wrapInline("u") },
    { label: "Strikethrough", icon: <Strikethrough className="h-4 w-4" />, onClick: () => wrapInline("s") },
    { label: "Text color", icon: <Type className="h-4 w-4" />, onClick: () => wrapInline("span", { "data-color": "brand" }) },
    { label: "Highlight", icon: <Type className="h-4 w-4 rounded bg-warning/20" />, onClick: () => wrapInline("span", { "data-highlight": "warning" }) },
    { label: "Align left", icon: <AlignLeft className="h-4 w-4" />, onClick: () => align("left") },
    { label: "Align center", icon: <AlignCenter className="h-4 w-4" />, onClick: () => align("center") },
    { label: "Align right", icon: <AlignRight className="h-4 w-4" />, onClick: () => align("right") },
    { label: "Justify", icon: <AlignJustify className="h-4 w-4" />, onClick: () => align("justify") },
    { label: "Undo", icon: <Undo2 className="h-4 w-4" />, onClick: undo },
    { label: "Redo", icon: <Redo2 className="h-4 w-4" />, onClick: redo },
    { label: "Numbered list", icon: <ListOrdered className="h-4 w-4" />, onClick: () => insertList("ol") },
    { label: "Bulleted list", icon: <List className="h-4 w-4" />, onClick: () => insertList("ul") },
    { label: "Outdent", icon: <IndentDecrease className="h-4 w-4" />, onClick: () => align("left") },
    { label: "Indent", icon: <IndentIncrease className="h-4 w-4" />, onClick: () => wrapInline("span", { "data-indent": "1" }) },
    { label: "Remove link", icon: <Unlink className="h-4 w-4" />, onClick: removeLink },
    { label: "Table", icon: <Table2 className="h-4 w-4" />, onClick: () => insertHtml("<table><tbody><tr><td>Cell</td><td>Cell</td></tr></tbody></table>") },
    { label: "Horizontal rule", icon: <Eraser className="h-4 w-4" />, onClick: () => insertHtml("<hr>") },
    { label: "Smiley", icon: <Smile className="h-4 w-4" />, onClick: () => insertHtml(":)") },
    { label: "Special character", icon: <span className="text-xs font-bold">Om</span>, onClick: () => insertHtml("Omega") },
    { label: "Quote", icon: <Quote className="h-4 w-4" />, onClick: () => formatBlock("blockquote") },
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
        <ToolbarSelect label="Styles" disabled={disabled} onChange={(val) => formatBlock(val as BlockTag)}>
          <option value="p">Normal</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
        </ToolbarSelect>
        <ToolbarSelect label="Format" disabled={disabled} onChange={(val) => wrapInline("span", { "data-size": val })}>
          <option value="small">Small</option>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
        </ToolbarSelect>
        <ToolbarSeparator />
        {actions.slice(0, 10).map((action) => <ToolbarButton key={action.label} action={action} disabled={disabled} />)}
        <ToolbarSeparator />
        {actions.slice(10, 16).map((action) => <ToolbarButton key={action.label} action={action} disabled={disabled} />)}
        <ToolbarSeparator />
        <button type="button" className="toolbar-button" disabled={disabled} title="Link" onMouseDown={saveSelection} onClick={openLinkModal}>
          <Link className="h-4 w-4" />
        </button>
        <ToolbarButton action={actions[16]} disabled={disabled} />
        <button
          type="button"
          className="toolbar-button"
          disabled={disabled || !onImageUpload || imageBusy}
          title={onImageUpload ? "Upload image" : "Image uploads require a record attachment handler"}
          onMouseDown={saveSelection}
          onClick={() => fileRef.current?.click()}
        >
          <Image className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file);
          }}
        />
        {actions.slice(17).map((action) => <ToolbarButton key={action.label} action={action} disabled={disabled} />)}
        <button type="button" className="toolbar-button ml-1" title="Fullscreen" onMouseDown={saveSelection} onClick={() => setFullscreen((current) => !current)}>
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
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onInput={recordChange}
        onBlur={recordChange}
        onPaste={(event) => {
          event.preventDefault();
          const html = event.clipboardData.getData("text/html");
          const text = event.clipboardData.getData("text/plain");
          insertHtml(html || escapeHtml(text));
        }}
        onDrop={(event) => {
          event.preventDefault();
          const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
          if (file) void uploadImage(file);
        }}
      />
      <Modal open={linkOpen} onOpenChange={setLinkOpen} title="Insert Link" description="Links are limited to http, https, and mailto addresses.">
        <div className="space-y-2">
          <Label htmlFor="rte-link-url">URL</Label>
          <Input id="rte-link-url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" />
          {linkError ? <p className="text-label text-error">{linkError}</p> : null}
        </div>
        <ModalFooter className="gap-2">
          <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
          <Button onClick={submitLink}>Insert</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function ToolbarButton({ action, disabled }: { action: ToolbarAction; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="toolbar-button"
      disabled={disabled || action.disabled}
      title={action.label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action.onClick}
    >
      {action.icon}
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
      onMouseDown={(event) => event.preventDefault()}
      onChange={(event) => {
        if (event.target.value) onChange(event.target.value);
        event.currentTarget.value = "";
      }}
    >
      <option value="">{label}</option>
      {children}
    </select>
  );
}

function ToolbarSeparator() {
  return <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />;
}

function nearestBlock(node: Node | null): HTMLElement | null {
  const element = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
  return (element?.closest(BLOCK_SELECTOR) as HTMLElement | null) ?? null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
