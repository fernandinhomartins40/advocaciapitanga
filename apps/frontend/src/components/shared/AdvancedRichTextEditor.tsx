'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Link2,
  Unlink,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Heading1,
  Heading2,
  Heading3,
  ListTodo,
  Table as TableIcon,
  Minus,
  Quote,
  Code,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface AdvancedRichTextEditorProps {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
}

export function AdvancedRichTextEditor({
  content,
  onChange,
  placeholder = 'Digite aqui...',
  editable = true,
  minHeight = '400px',
}: AdvancedRichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 underline cursor-pointer',
        },
      }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none p-6 ${!editable ? 'cursor-default' : ''}`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  const setTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setShowColorPicker(false);
  };

  const setHighlightColor = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
    setShowHighlightPicker(false);
  };

  const setFontFamily = (font: string) => {
    editor.chain().focus().setFontFamily(font).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const colors = [
    '#000000', '#374151', '#DC2626', '#EA580C', '#D97706',
    '#65A30D', '#059669', '#0891B2', '#2563EB', '#7C3AED',
    '#C026D3', '#DB2777'
  ];

  const highlightColors = [
    '#FEF3C7', '#FED7AA', '#FEE2E2', '#FCE7F3', '#E9D5FF',
    '#DBEAFE', '#D1FAE5', '#D1FAE5', '#E0F2FE'
  ];

  const fonts = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
  ];

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {editable && (
        <div className="border-b bg-gray-50">
          {/* Primeira linha de ferramentas */}
          <div className="p-2 flex flex-wrap gap-1 border-b border-gray-200">
            {/* Desfazer/Refazer */}
            <ToolbarButton
              icon={Undo}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Desfazer (Ctrl+Z)"
            />
            <ToolbarButton
              icon={Redo}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Refazer (Ctrl+Y)"
            />

            <Separator />

            {/* Fonte */}
            <select
              onChange={(e) => setFontFamily(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-white hover:bg-gray-100 cursor-pointer"
              title="Família da fonte"
            >
              <option value="">Fonte</option>
              {fonts.map(font => (
                <option key={font.value} value={font.value}>{font.name}</option>
              ))}
            </select>

            <Separator />

            {/* Títulos */}
            <ToolbarButton
              icon={Heading1}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Título 1"
            />
            <ToolbarButton
              icon={Heading2}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Título 2"
            />
            <ToolbarButton
              icon={Heading3}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Título 3"
            />

            <Separator />

            {/* Formatação de texto */}
            <ToolbarButton
              icon={Bold}
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Negrito (Ctrl+B)"
            />
            <ToolbarButton
              icon={Italic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Itálico (Ctrl+I)"
            />
            <ToolbarButton
              icon={UnderlineIcon}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Sublinhado (Ctrl+U)"
            />
            <ToolbarButton
              icon={Strikethrough}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Tachado"
            />

            <Separator />

            {/* Cor do texto */}
            <div className="relative">
              <ToolbarButton
                icon={({ className }: { className: string }) => (
                  <div className={className}>
                    <div>A</div>
                    <div className="h-1 w-full bg-current mt-0.5"></div>
                  </div>
                )}
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Cor do texto"
              />
              {showColorPicker && (
                <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg p-2 z-10">
                  <div className="grid grid-cols-6 gap-1">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setTextColor(color)}
                        className="w-6 h-6 rounded border hover:border-gray-400"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Realce */}
            <div className="relative">
              <ToolbarButton
                icon={Highlighter}
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                isActive={editor.isActive('highlight')}
                title="Realçar texto"
              />
              {showHighlightPicker && (
                <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg p-2 z-10">
                  <div className="grid grid-cols-6 gap-1">
                    {highlightColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setHighlightColor(color)}
                        className="w-6 h-6 rounded border hover:border-gray-400"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      editor.chain().focus().unsetHighlight().run();
                      setShowHighlightPicker(false);
                    }}
                    className="mt-2 text-xs text-gray-600 hover:text-gray-800 w-full text-center"
                  >
                    Remover realce
                  </button>
                </div>
              )}
            </div>

            <Separator />

            {/* Subscrito/Sobrescrito */}
            <ToolbarButton
              icon={SubscriptIcon}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              isActive={editor.isActive('subscript')}
              title="Subscrito"
            />
            <ToolbarButton
              icon={SuperscriptIcon}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              isActive={editor.isActive('superscript')}
              title="Sobrescrito"
            />
          </div>

          {/* Segunda linha de ferramentas */}
          <div className="p-2 flex flex-wrap gap-1">
            {/* Alinhamento */}
            <ToolbarButton
              icon={AlignLeft}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="Alinhar à esquerda"
            />
            <ToolbarButton
              icon={AlignCenter}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="Centralizar"
            />
            <ToolbarButton
              icon={AlignRight}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="Alinhar à direita"
            />
            <ToolbarButton
              icon={AlignJustify}
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              isActive={editor.isActive({ textAlign: 'justify' })}
              title="Justificar"
            />

            <Separator />

            {/* Listas */}
            <ToolbarButton
              icon={List}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Lista com marcadores"
            />
            <ToolbarButton
              icon={ListOrdered}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Lista numerada"
            />
            <ToolbarButton
              icon={ListTodo}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              title="Lista de tarefas"
            />

            <Separator />

            {/* Citação e código */}
            <ToolbarButton
              icon={Quote}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Citação"
            />
            <ToolbarButton
              icon={Code}
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Código inline"
            />
            <ToolbarButton
              icon={Minus}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Linha horizontal"
            />

            <Separator />

            {/* Tabela */}
            <ToolbarButton
              icon={TableIcon}
              onClick={insertTable}
              title="Inserir tabela"
            />

            <Separator />

            {/* Links */}
            <ToolbarButton
              icon={Link2}
              onClick={addLink}
              isActive={editor.isActive('link')}
              title="Inserir link"
            />
            <ToolbarButton
              icon={Unlink}
              onClick={removeLink}
              disabled={!editor.isActive('link')}
              title="Remover link"
            />
          </div>
        </div>
      )}
      <div className="relative">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Componente auxiliar para botões da toolbar
interface ToolbarButtonProps {
  icon: LucideIcon | ((props: { className: string }) => JSX.Element);
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
}

function ToolbarButton({ icon: Icon, onClick, isActive, disabled, title }: ToolbarButtonProps) {
  const isReactComponent = typeof Icon === 'function' && Icon.length === 0;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-primary-100 text-primary-700' : ''}`}
      title={title}
    >
      {isReactComponent ? (
        <Icon className="h-4 w-4" />
      ) : typeof Icon === 'function' ? (
        Icon({ className: 'h-4 w-4' })
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </Button>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-gray-300 mx-1" />;
}
