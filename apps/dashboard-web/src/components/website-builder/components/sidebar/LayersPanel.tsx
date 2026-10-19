import React, { useState, useRef, useMemo } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronRight,
  ChevronDown,
  Layout,
  Type,
  Image as ImageIcon,
  MousePointer,
  Sparkles,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  Search,
  GripVertical,
  FolderOpen,
  FolderClosed,
  ChevronsDownUp,
  ChevronsUpDown,
  CornerDownLeft,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { ComponentNode, ComponentType } from '../../types/builder';

type DropPosition = 'before' | 'after' | 'inside';

export const LayersPanel: React.FC = () => {
  const {
    website,
    activePage,
    selectedNodeId,
    selectNode,
    deleteNode,
    duplicateNode,
    moveNode,
    moveNodePosition,
    toggleNodeVisibility,
    toggleNodeLock,
    renameNode,
  } = useBuilder();

  // Search filter query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Node expand/collapse state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    [activePage.rootNodeId]: true,
    page_root: true,
    comp_header: true,
    comp_hero: true,
    header_inner_container: true,
    hero_container: true,
    comp_bento_features: true,
    bento_container: true,
  });

  // Inline rename state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // Dropdown actions menu open state
  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);

  // Drag & Drop State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);

  // Toggle single node expansion
  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand all nodes
  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    Object.keys(website.components).forEach((id) => {
      allExpanded[id] = true;
    });
    setExpandedNodes(allExpanded);
  };

  // Collapse all nodes except root
  const collapseAll = () => {
    setExpandedNodes({ [activePage.rootNodeId]: true });
  };

  // Arabic labels & icons for component types
  const getComponentTypeInfo = (type: ComponentType) => {
    switch (type) {
      case 'header':
        return { label: 'ترويسة', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: Layers };
      case 'footer':
        return { label: 'تذييل', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: Layers };
      case 'hero':
        return { label: 'قسم رئيسي', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Sparkles };
      case 'bento-grid':
      case 'grid':
        return { label: 'شبكة', color: 'text-cyan-600 bg-cyan-50 border-cyan-200', icon: Layout };
      case 'container':
      case 'card':
        return { label: 'حاوية', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Layout };
      case 'flex':
        return { label: 'تخطيط مرن', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Layout };
      case 'heading':
        return { label: 'عنوان', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Type };
      case 'paragraph':
        return { label: 'نص', color: 'text-slate-600 bg-slate-100 border-slate-200', icon: Type };
      case 'image':
        return { label: 'صورة', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: ImageIcon };
      case 'button':
        return { label: 'زر', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: MousePointer };
      case 'products':
        return { label: 'منتجات', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: Layers };
      case 'testimonials':
        return { label: 'آراء العملاء', color: 'text-teal-600 bg-teal-50 border-teal-200', icon: Layers };
      case 'pricing':
        return { label: 'أسعار', color: 'text-green-600 bg-green-50 border-green-200', icon: Layers };
      case 'features':
        return { label: 'مميزات', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Layers };
      default:
        return { label: 'عنصر', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: Layout };
    }
  };

  const isContainerType = (type: ComponentType): boolean => {
    return [
      'container',
      'flex',
      'grid',
      'card',
      'header',
      'footer',
      'hero',
      'bento-grid',
      'pricing',
      'features',
      'gallery',
      'testimonials',
      'cta',
      'products',
      'section',
    ].includes(type);
  };

  const startRenaming = (node: ComponentNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuNodeId(null);
    setEditingNodeId(node.id);
    setEditingName(node.name);
  };

  const saveRename = (id: string) => {
    if (editingName.trim()) {
      renameNode(id, editingName.trim());
    }
    setEditingNodeId(null);
  };

  // Check if candidate is a descendant of ancestor (cycle prevention)
  const isDescendant = (ancestorId: string, candidateId: string): boolean => {
    let curr = website.components[candidateId];
    while (curr && curr.parentId) {
      if (curr.parentId === ancestorId) return true;
      curr = website.components[curr.parentId];
    }
    return false;
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, node: ComponentNode) => {
    if (node.isLocked || !node.parentId) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDraggedNodeId(node.id);
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, targetNode: ComponentNode) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNodeId || draggedNodeId === targetNode.id) {
      return;
    }

    // Prevent dragging parent into its own child
    if (isDescendant(draggedNodeId, targetNode.id)) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    const isContainer = isContainerType(targetNode.type) || (targetNode.childrenIds && targetNode.childrenIds.length > 0);

    let pos: DropPosition;
    if (targetNode.id === activePage.rootNodeId) {
      // Root node can only accept drops inside
      pos = 'inside';
    } else if (isContainer) {
      // 3 zones: top 25% = before, bottom 25% = after, middle 50% = inside
      if (relativeY < height * 0.28) {
        pos = 'before';
      } else if (relativeY > height * 0.72) {
        pos = 'after';
      } else {
        pos = 'inside';
      }
    } else {
      // 2 zones: top 50% = before, bottom 50% = after
      if (relativeY < height * 0.5) {
        pos = 'before';
      } else {
        pos = 'after';
      }
    }

    setDragOverNodeId(targetNode.id);
    setDropPosition(pos);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent, targetNode: ComponentNode) => {
    e.stopPropagation();
    if (dragOverNodeId === targetNode.id) {
      setDragOverNodeId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetNode: ComponentNode) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceId = draggedNodeId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetNode.id || !dropPosition) {
      handleDragEnd();
      return;
    }

    if (isDescendant(sourceId, targetNode.id)) {
      handleDragEnd();
      return;
    }

    // Execute Move
    moveNodePosition(sourceId, targetNode.id, dropPosition);

    // Auto-expand target if dropped inside
    if (dropPosition === 'inside') {
      setExpandedNodes((prev) => ({ ...prev, [targetNode.id]: true }));
    }

    handleDragEnd();
  };

  // Filtered nodes calculation
  const searchFilter = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    const matchedIds = new Set<string>();

    Object.values(website.components).forEach((node) => {
      const typeInfo = getComponentTypeInfo(node.type);
      if (
        node.name.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query) ||
        typeInfo.label.toLowerCase().includes(query)
      ) {
        matchedIds.add(node.id);
        // Add all ancestors so the path is visible
        let curr = node;
        while (curr && curr.parentId) {
          matchedIds.add(curr.parentId);
          curr = website.components[curr.parentId];
        }
      }
    });

    return matchedIds;
  }, [searchQuery, website.components]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (nodeId: string, depth = 0): React.ReactNode => {
    const node = website.components[nodeId];
    if (!node) return null;

    if (searchFilter && !searchFilter.has(node.id)) {
      return null;
    }

    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.childrenIds && node.childrenIds.length > 0;
    const isExpanded = searchFilter ? true : !!expandedNodes[node.id];
    const isRoot = !node.parentId;
    const isDragging = draggedNodeId === node.id;
    const isDragOver = dragOverNodeId === node.id;
    const typeInfo = getComponentTypeInfo(node.type);
    const IconComponent = typeInfo.icon;

    return (
      <div key={node.id} className="relative select-none group/node">
        {/* Drop Indicator: Before */}
        {isDragOver && dropPosition === 'before' && (
          <div className="absolute top-0 right-2 left-2 h-1 bg-blue-600 rounded-full z-30 shadow-sm flex items-center -translate-y-1/2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white shadow-xs -mr-1" />
          </div>
        )}

        {/* Tree Item Row */}
        <div
          id={`layer_node_${node.id}`}
          draggable={!node.isLocked && !isRoot}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={(e) => handleDragLeave(e, node)}
          onDrop={(e) => handleDrop(e, node)}
          onClick={(e) => {
            e.stopPropagation();
            selectNode(node.id);
          }}
          className={`relative flex items-center justify-between py-1.5 px-2 my-0.5 rounded-lg cursor-pointer text-xs transition-all ${
            isDragging
              ? 'opacity-40 bg-blue-50 border border-dashed border-blue-400'
              : isDragOver && dropPosition === 'inside'
              ? 'bg-blue-100/80 border-2 border-dashed border-blue-500 shadow-inner'
              : isSelected
              ? 'bg-blue-50 text-blue-950 font-semibold ring-1.5 ring-blue-500 shadow-xs'
              : 'text-slate-700 hover:bg-slate-100/90'
          }`}
          style={{
            paddingRight: `${Math.max(6, depth * 14 + 6)}px`,
          }}
        >
          {/* Visual Tree Guide Connector lines */}
          {depth > 0 && (
            <div
              className="absolute top-0 bottom-0 border-r border-slate-200 pointer-events-none"
              style={{ right: `${depth * 14 - 2}px` }}
            />
          )}

          {/* Left/Start: Drag Handle + Expand Button + Type Icon + Name */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-0.5">
            {/* Drag Handle (for non-root) */}
            {!isRoot && !node.isLocked && (
              <div
                title="اسحب لإعادة الترتيب"
                className="cursor-grab active:cursor-grabbing p-0.5 text-slate-300 hover:text-slate-600 opacity-0 group-hover/node:opacity-100 transition-opacity shrink-0"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Expand / Collapse Chevron */}
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                title={isExpanded ? 'طي' : 'توسيع'}
                className="p-1 -mr-1 hover:bg-slate-200/80 rounded-md text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                )}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            {/* Component Type Icon */}
            <div
              className={`p-1 rounded-md shrink-0 ${
                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
            </div>

            {/* Node Name / Inline Editor */}
            {editingNodeId === node.id ? (
              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename(node.id);
                    if (e.key === 'Escape') setEditingNodeId(null);
                  }}
                  autoFocus
                  className="px-2 py-0.5 text-xs bg-white border border-blue-500 rounded-md w-full outline-hidden text-slate-900 shadow-xs"
                />
                <button
                  onClick={() => saveRename(node.id)}
                  title="حفظ"
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md shrink-0 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingNodeId(null)}
                  title="إلغاء"
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded-md shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                onDoubleClick={(e) => startRenaming(node, e)}
                title={`${node.name} (انقر مرتين لإعادة التسمية)`}
              >
                <span className="font-medium text-slate-800 truncate text-[12px]">
                  {node.name}
                </span>

                {/* Subtle Type Pill */}
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 border ${typeInfo.color}`}
                >
                  {typeInfo.label}
                </span>

                {node.isGlobal && (
                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                    عام
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Status Icons & Compact Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Visibility Toggle */}
            {(() => {
              const isHidden = Boolean(node.isHidden || node.props?.hidden);
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNodeVisibility(node.id);
                  }}
                  title={isHidden ? 'إظهار العنصر' : 'إخفاء العنصر'}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    isHidden
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover/node:opacity-100'
                  }`}
                >
                  {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              );
            })()}

            {/* Lock Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeLock(node.id);
              }}
              title={node.isLocked ? 'إلغاء القفل' : 'قفل العنصر'}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                node.isLocked
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover/node:opacity-100'
              }`}
            >
              {node.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {/* Quick More Options Menu */}
            {!isRoot && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuNodeId(activeMenuNodeId === node.id ? null : node.id);
                  }}
                  title="خيارات إضافية"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 transition-colors opacity-0 group-hover/node:opacity-100 cursor-pointer"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown Menu */}
                {activeMenuNodeId === node.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      onClick={(e) => {
                        moveNode(node.id, 'up');
                        setActiveMenuNodeId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 text-right cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>تحريك للأعلى</span>
                    </button>

                    <button
                      onClick={(e) => {
                        moveNode(node.id, 'down');
                        setActiveMenuNodeId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 text-right cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>تحريك للأسفل</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={(e) => {
                        startRenaming(node, e);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 text-right cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>إعادة تسمية</span>
                    </button>

                    <button
                      onClick={() => {
                        duplicateNode(node.id);
                        setActiveMenuNodeId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 text-right cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>تكرار العنصر</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        deleteNode(node.id);
                        setActiveMenuNodeId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 text-right cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف العنصر</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drop Indicator: After */}
        {isDragOver && dropPosition === 'after' && (
          <div className="absolute bottom-0 right-2 left-2 h-1 bg-blue-600 rounded-full z-30 shadow-sm flex items-center translate-y-1/2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white shadow-xs -mr-1" />
          </div>
        )}

        {/* Render Children Recursively */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5 relative">
            {node.childrenIds.map((childId) => renderTreeNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalComponentsCount = Object.keys(website.components).length;

  return (
    <div
      className="p-3 space-y-3"
      onClick={() => {
        if (activeMenuNodeId) setActiveMenuNodeId(null);
      }}
    >
      {/* Header Info & Actions */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">شجرة الطبقات والمكونات</h3>
            <p className="text-[10px] text-slate-400">اسحب وأفلت لإعادة ترتيب العناصر</p>
          </div>
        </div>
        <span className="text-[11px] text-slate-600 bg-slate-100 font-semibold px-2 py-0.5 rounded-full">
          {totalComponentsCount} عنصر
        </span>
      </div>

      {/* Search and Expand/Collapse Toolbar */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الطبقات..."
            className="w-full text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg pr-8 pl-6 py-1.5 outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          onClick={expandAll}
          title="توسيع كل الطبقات"
          className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={collapseAll}
          title="طي كل الطبقات"
          className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
        >
          <ChevronsDownUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Drag & Drop Hint Banner */}
      <div className="bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5 text-[10.5px] text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>اسحب أي طبقة وأفلتها في المكان المناسب (قبل، بعد، أو داخل حاوية)</span>
        </div>
      </div>

      {/* Tree Container */}
      <div className="space-y-0.5 max-h-[calc(100vh-270px)] overflow-y-auto overflow-x-hidden pr-0.5 pl-0.5 scrollbar-thin">
        {renderTreeNode(activePage.rootNodeId, 0)}
      </div>
    </div>
  );
};
