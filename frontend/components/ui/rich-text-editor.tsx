"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Image, Minus } from "lucide-react";
import { useRef, useCallback } from "react";

type Props = {
    content: string | null;
    onChange: (json: string) => void;
    placeholder?: string;
    editable?: boolean;
    onImageUpload?: (file: File) => Promise<string | null>;
};

type ToolbarButtonProps = {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
};

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                onClick();
            }}
            title={title}
            className={`h-7 w-7 flex items-center justify-center rounded text-sm transition-colors ${
                active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground"
            }`}
        >
            {children}
        </button>
    );
}

export default function RichTextEditor({ content, onChange, placeholder, editable = true, onImageUpload }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            ImageExtension.configure({ inline: false }),
            Placeholder.configure({
                placeholder: placeholder ?? "Rédigez ici…",
            }),
        ],
        content: content ? JSON.parse(content) : null,
        editable,
        onUpdate({ editor }) {
            onChange(JSON.stringify(editor.getJSON()));
        },
        editorProps: {
            attributes: {
                class: "outline-none min-h-[120px] prose prose-sm max-w-none text-foreground",
            },
        },
        immediatelyRender: false,
    });

    const handleImageFile = useCallback(
        async (file: File) => {
            if (!editor || !onImageUpload) return;
            const url = await onImageUpload(file);
            if (url) {
                editor.chain().focus().setImage({ src: url }).run();
            }
        },
        [editor, onImageUpload],
    );

    const handleImageClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    if (!editor) return null;

    return (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
            {editable && (
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-subtle">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive("bold")}
                        title="Gras"
                    >
                        <Bold className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive("italic")}
                        title="Italique"
                    >
                        <Italic className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <div className="w-px h-4 bg-border mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive("heading", { level: 2 })}
                        title="Titre 2"
                    >
                        <Heading2 className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive("heading", { level: 3 })}
                        title="Titre 3"
                    >
                        <Heading3 className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <div className="w-px h-4 bg-border mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive("bulletList")}
                        title="Liste à puces"
                    >
                        <List className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive("orderedList")}
                        title="Liste numérotée"
                    >
                        <ListOrdered className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <div className="w-px h-4 bg-border mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Séparateur"
                    >
                        <Minus className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    {onImageUpload && (
                        <>
                            <ToolbarButton onClick={handleImageClick} title="Insérer une image">
                                <Image className="h-3.5 w-3.5" />
                            </ToolbarButton>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleImageFile(file);
                                        e.target.value = "";
                                    }
                                }}
                            />
                        </>
                    )}
                </div>
            )}
            <div className="px-4 py-3">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
