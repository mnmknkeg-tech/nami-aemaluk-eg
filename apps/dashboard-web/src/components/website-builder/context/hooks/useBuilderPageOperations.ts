import { useCallback, useMemo } from 'react';
import {
  AddPageOptions,
  DropdownSubItem,
  Page,
  PageMetadata,
  PagePlacementMode,
  Website,
} from '../../types/builder';
import { createUniqueBuilderId } from '../builderUtils';

export interface UseBuilderPageOperationsProps {
  website: Website;
  websiteRef?: { current: Website };
  activePageId: string;
  setActivePageId: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  recordHistory: (actionDesc: string, newWebsite: Website) => void;
}

const collectReachableIds = (website: Website, roots: string[]): Set<string> => {
  const reachable = new Set<string>();
  const visit = (id: string) => {
    if (reachable.has(id) || !website.components[id]) return;
    reachable.add(id);
    website.components[id].childrenIds?.forEach(visit);
  };
  roots.forEach(visit);
  return reachable;
};

export const removePageAndOrphans = (currentWebsite: Website, pageId: string): Website => {
  const deletedPage = currentWebsite.pages.find((page) => page.id === pageId);
  if (!deletedPage || currentWebsite.pages.length <= 1) return currentWebsite;
  const newPages = currentWebsite.pages.filter((page) => page.id !== pageId);
  const removedPageReachable = collectReachableIds(currentWebsite, [deletedPage.rootNodeId]);
  const components = { ...currentWebsite.components };
  for (const [id, node] of Object.entries(components)) {
    const childrenIds = (node.childrenIds || []).filter((childId) => {
      const child = components[childId];
      return !(child?.props?.pageId === pageId || child?.props?.url === `/${deletedPage.slug}`);
    });
    const dropdownItems = Array.isArray(node.props?.dropdownItems)
      ? node.props.dropdownItems.filter(
          (item: DropdownSubItem) => item.pageId !== pageId && item.url !== `/${deletedPage.slug}`
        )
      : undefined;
    if (
      childrenIds.length !== (node.childrenIds || []).length ||
      dropdownItems?.length !== node.props?.dropdownItems?.length
    ) {
      components[id] = {
        ...node,
        childrenIds,
        props: dropdownItems ? { ...node.props, dropdownItems } : node.props,
      };
    }
  }
  const newWebsite: Website = { ...currentWebsite, pages: newPages, components };
  const remainingReachable = collectReachableIds(newWebsite, newPages.map((page) => page.rootNodeId));
  for (const id of removedPageReachable) {
    if (!remainingReachable.has(id)) delete newWebsite.components[id];
  }
  return newWebsite;
};

export const useBuilderPageOperations = ({
  website,
  websiteRef,
  activePageId,
  setActivePageId,
  setSelectedNodeId,
  recordHistory,
}: UseBuilderPageOperationsProps) => {
  const activePage = useMemo(() => {
    return website.pages.find((p) => p.id === activePageId) || website.pages[0];
  }, [website.pages, activePageId]);

  const switchPage = useCallback(
    (pageId: string) => {
      const target = website.pages.find((p) => p.id === pageId);
      if (target) {
        setActivePageId(pageId);
        setSelectedNodeId(target.rootNodeId);
      }
    },
    [website.pages, setActivePageId, setSelectedNodeId]
  );

  const getHeaderDropdownNavItems = useCallback(() => {
    const navContainer = website.components['header_nav'];
    if (!navContainer || !navContainer.childrenIds) return [];

    return navContainer.childrenIds
      .map((cId) => {
        const node = website.components[cId];
        if (!node) return null;
        const title = node.props?.text || node.name || cId;
        const itemsCount = node.props?.dropdownItems?.length || 0;
        return {
          id: cId,
          name: node.name || cId,
          title,
          itemsCount,
          hasDropdown: !!node.props?.hasDropdown,
        };
      })
      .filter(Boolean) as { id: string; name: string; title: string; itemsCount: number }[];
  }, [website.components]);

  const addPage = useCallback(
    (
      nameOrOptions: string | AddPageOptions,
      maybeSlug?: string,
      extraOptions?: Partial<AddPageOptions>
    ) => {
      const currentWebsite = websiteRef?.current ?? website;
      let options: AddPageOptions;
      if (typeof nameOrOptions === 'string') {
        options = {
          name: nameOrOptions,
          slug: maybeSlug || nameOrOptions.toLowerCase().replace(/\s+/g, '-'),
          placement: extraOptions?.placement || 'header_direct',
          headerTitle: extraOptions?.headerTitle || nameOrOptions,
          parentNavId: extraOptions?.parentNavId,
          dropdownDescription: extraOptions?.dropdownDescription,
          dropdownBadge: extraOptions?.dropdownBadge,
          includeHeaderFooter: extraOptions?.includeHeaderFooter !== false,
          pageTemplate: extraOptions?.pageTemplate || 'blank',
        };
      } else {
        options = {
          placement: 'header_direct',
          includeHeaderFooter: true,
          pageTemplate: 'blank',
          ...nameOrOptions,
        };
      }

      const {
        name,
        slug,
        placement = 'header_direct',
        headerTitle,
        parentNavId,
        dropdownDescription,
        dropdownBadge,
        includeHeaderFooter = true,
        pageTemplate = 'blank',
      } = options;

      const usedIds = new Set([...currentWebsite.pages.map((page) => page.id), ...Object.keys(currentWebsite.components)]);
      const newPageId = createUniqueBuilderId('page', usedIds);
      const rootId = createUniqueBuilderId('root', usedIds);
      const cleanSlug = (slug || name).toLowerCase().replace(/\s+/g, '-');
      const newComponents = { ...currentWebsite.components };
      const cloneSubtree = (sourceId: string, parentId: string | null, path = new Set<string>()): string | null => {
        const source = currentWebsite.components[sourceId];
        if (!source || path.has(sourceId)) return null;
        const clonedId = createUniqueBuilderId('page_component', usedIds);
        const nextPath = new Set(path).add(sourceId);
        const clonedChildren: string[] = [];
        newComponents[clonedId] = { ...source, id: clonedId, parentId, childrenIds: clonedChildren };
        for (const childId of source.childrenIds || []) {
          const childCloneId = cloneSubtree(childId, clonedId, nextPath);
          if (childCloneId) clonedChildren.push(childCloneId);
        }
        return clonedId;
      };

      // Build template sections
      const pageSectionIds: string[] = [];
      const heroId = createUniqueBuilderId('hero', usedIds);
      pageSectionIds.push(heroId);

      // Default Hero for the new page
      newComponents[heroId] = {
        id: heroId,
        name: `قسم ${name} الترحيبي`,
        type: 'hero',
        category: 'section',
        parentId: rootId,
        childrenIds: [],
        props: {
          badge: dropdownBadge || 'قسم جديد',
          title: name,
          subtitle:
            dropdownDescription ||
            `مرحباً بك في صفحة ${name}. تم إعداد الصفحة وجاهزة للتخصيص الكامل وإضافة المكونات.`,
        },
        styles: {
          desktop: {
            display: 'block',
            width: '100%',
            backgroundColor: '#f8fafc',
            paddingTop: '70px',
            paddingBottom: '70px',
            borderBottomWidth: '1px',
            borderColor: '#e2e8f0',
          },
        },
      };

      // If catalog grid template selected
      if (pageTemplate === 'catalog_grid') {
        const filterId = createUniqueBuilderId('filter', usedIds);
        const gridId = createUniqueBuilderId('grid', usedIds);
        pageSectionIds.push(filterId, gridId);

        newComponents[filterId] = {
          id: filterId,
          name: 'تبويبات الفلترة والتصنيف',
          type: 'product_filter_tabs',
          category: 'commerce',
          parentId: rootId,
          childrenIds: [],
          props: {
            filters: [
              { id: 'all', label: 'كافة التصنيفات', count: 12 },
              { id: 'featured', label: 'الأكثر طلباً', count: 5 },
              { id: 'offers', label: 'العروض الخاصة', count: 4 },
            ],
            activeFilterId: 'all',
          },
          styles: {
            desktop: {
              display: 'block',
              width: '100%',
              backgroundColor: '#ffffff',
              paddingTop: '24px',
              paddingBottom: '16px',
            },
          },
        };

        newComponents[gridId] = {
          id: gridId,
          name: 'شبكة المنتجات المعروضة',
          type: 'card',
          category: 'commerce',
          parentId: rootId,
          childrenIds: [],
          props: {
            title: `منتجات ${name}`,
            description: 'تصفح باقة مختارة وعروض حصرية للتسليم الفوري.',
            price: '520,000 ج.م',
            badge: 'جديد',
            image:
              'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80',
            ctaText: 'طلب فحص وتجربة',
          },
          styles: {
            desktop: {
              display: 'block',
              width: '100%',
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              borderWidth: '1px',
              borderColor: '#e2e8f0',
            },
          },
        };
      }

      // If product page template selected
      if (pageTemplate === 'product_page') {
        const productShowcaseId = createUniqueBuilderId('pdetail', usedIds);
        const specsId = createUniqueBuilderId('pspecs', usedIds);
        pageSectionIds.push(productShowcaseId, specsId);

        newComponents[productShowcaseId] = {
          id: productShowcaseId,
          name: 'عرض وشراء المنتج',
          type: 'card',
          category: 'commerce',
          parentId: rootId,
          childrenIds: [],
          props: {
            title: name,
            description: dropdownDescription || 'تفاصيل ومواصفات المنتج مع الشحن السريع والضمان.',
            price: '450 ج.م',
            badge: 'متاح للطلب الفوري',
            image:
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
            hoverImage:
              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
            specs: [
              'ضمان استبدال واسترجاع لمدة 14 يوم',
              'معاينة وفحص المنتج قبل الدفع',
              'شحن سريع لجميع المحافظات',
            ],
            buyButtonText: 'أضف للسلة الآن',
            ctaText: 'اطلب عبر واتساب',
          },
          styles: {
            desktop: {
              display: 'block',
              width: '100%',
              maxWidth: '1100px',
              margin: '32px auto',
              padding: '32px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              borderWidth: '1px',
              borderColor: '#e2e8f0',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
            },
          },
        };

        newComponents[specsId] = {
          id: specsId,
          name: 'المواصفات والشحن',
          type: 'bento',
          category: 'section',
          parentId: rootId,
          childrenIds: [],
          props: {
            title: 'المواصفات والضمان وتفاصيل التوصيل',
            subtitle: 'جميع المعلومات المعتمدة للطلب والشحن وخدمة ما بعد البيع.',
            icon: 'ShieldCheck',
            badge: 'معتمد',
          },
          styles: {
            desktop: {
              display: 'block',
              width: '100%',
              backgroundColor: '#f8fafc',
              paddingTop: '48px',
              paddingBottom: '48px',
            },
          },
        };
      }

      // If login page template selected
      if (pageTemplate === 'login_page') {
        const authSectionId = createUniqueBuilderId('auth_section', usedIds);
        pageSectionIds.length = 0; // Replace default hero with dedicated login section
        pageSectionIds.push(authSectionId);

        newComponents[authSectionId] = {
          id: authSectionId,
          name: 'نموذج تسجيل الدخول المستقل',
          type: 'auth',
          category: 'auth',
          parentId: rootId,
          childrenIds: [],
          props: {
            title: 'تسجيل الدخول إلى حسابك',
            subtitle: 'سجل دخولك لمتابعة طلباتك والاستفادة من العروض والاشتراكات الحصرية',
            layout: 'split',
            defaultTab: 'login',
            allowGuest: website.settings?.auth?.allowGuestCheckout !== false,
            perks: [
              'متابعة حالة شحن وتوصيل الطلبات لحظة بلحظة',
              'إدارة وتجديد اشتراكات العضوية بنقرة واحدة',
              'خصومات وعروض أسعار خاصة بالمشتركين فقط',
              'دعم فني واستشارات مخصصة عبر واتساب',
            ],
          },
          styles: {
            desktop: {
              display: 'block',
              width: '100%',
              backgroundColor: '#f8fafc',
              paddingTop: '60px',
              paddingBottom: '80px',
            },
          },
        };
      }

      // If register page template selected
      if (pageTemplate === 'register_page') {
        const authSectionId = createUniqueBuilderId('auth_section', usedIds);
        pageSectionIds.length = 0; // Replace default hero with dedicated register section
        pageSectionIds.push(authSectionId);

        newComponents[authSectionId] = {
          id: authSectionId,
          name: 'نموذج إنشاء حساب جديد',
          type: 'auth',
          category: 'auth',
          parentId: rootId,
          childrenIds: [],
          props: {
            title: 'إنشاء حساب عميل جديد',
            subtitle: 'انضم إلينا اليوم لتجربة شراء سريعة ومزايا حصرية لأعضائنا',
            layout: 'split',
            defaultTab: 'register',
            allowGuest: website.settings?.auth?.allowGuestCheckout !== false,
            perks: [
              'متابعة وتوثيق كافة الفواتير والطلبات',
              'تفعيل فوري للباقات واشتراكات الخدمات',
              'نقاط مكافآت ورصيد ولاء عند كل عملية',
              'أولوية قصوى في معالجة وشحن الشحنات',
            ],
          },
          styles: {
            desktop: {
              display: 'block',
              width: '100%',
              backgroundColor: '#f8fafc',
              paddingTop: '60px',
              paddingBottom: '80px',
            },
          },
        };
      }

      // Root children
      const rootChildrenIds: string[] = [];
      if (includeHeaderFooter && newComponents['comp_header']) {
        const headerId = cloneSubtree('comp_header', rootId);
        if (headerId) rootChildrenIds.push(headerId);
      }
      rootChildrenIds.push(...pageSectionIds);
      if (includeHeaderFooter && newComponents['comp_footer']) {
        const footerId = cloneSubtree('comp_footer', rootId);
        if (footerId) rootChildrenIds.push(footerId);
      }

      newComponents[rootId] = {
        id: rootId,
        name: `صفحة ${name}`,
        type: 'container',
        category: 'layout',
        parentId: null,
        childrenIds: rootChildrenIds,
        props: {},
        styles: {
          desktop: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            textColor: '#0f172a',
          },
        },
      };

      // Apply Navigation Placement
      const navText = headerTitle || name;
      if (placement === 'header_direct' || placement === 'header_and_footer') {
        const navContainerIds = new Set<string>();
        const visitForNavigation = (id: string, seen = new Set<string>()) => {
          if (seen.has(id)) return;
          seen.add(id);
          const candidate = newComponents[id];
          if (!candidate) return;
          if (
            Array.isArray(candidate.childrenIds) &&
            (id === 'header_nav' || id.toLowerCase().includes('nav') || candidate.category === 'navigation')
          ) {
            navContainerIds.add(id);
          }
          candidate.childrenIds?.forEach((childId: string) => visitForNavigation(childId, seen));
        };
        [...currentWebsite.pages.map((page) => page.rootNodeId), rootId].forEach((root) =>
          visitForNavigation(root)
        );
        if (navContainerIds.size === 0 && newComponents['header_nav']) navContainerIds.add('header_nav');
        for (const navContainerId of navContainerIds) {
          const navLinkId = createUniqueBuilderId('nav_link', usedIds);
          const headerNav = newComponents[navContainerId];
          if (!headerNav) continue;
          newComponents[navLinkId] = {
            id: navLinkId,
            name: `رابط ${navText}`,
            type: 'paragraph',
            category: 'typography',
            parentId: 'header_nav',
            childrenIds: [],
            props: {
              text: navText,
              url: `/${cleanSlug}`,
              pageId: newPageId,
            },
            styles: {
              desktop: {
                fontSize: '15px',
                fontWeight: '500',
                textColor: '#475569',
              },
            },
          };
          newComponents[navContainerId] = {
            ...headerNav,
            childrenIds: [...headerNav.childrenIds, navLinkId],
          };
        }
      } else if (placement === 'header_dropdown') {
        const targetParentNavId = parentNavId || 'nav_link_2';
        const targetNavNode = newComponents[targetParentNavId];
        if (targetNavNode) {
          const existingDropdownItems: DropdownSubItem[] = targetNavNode.props.dropdownItems || [];
          const newDropdownItem: DropdownSubItem = {
            id: createUniqueBuilderId('sub', usedIds),
            title: navText,
            description: dropdownDescription || `تصفح تفاصيل ومحتوى ${name}`,
            url: `/${cleanSlug}`,
            pageId: newPageId,
            badge: dropdownBadge || undefined,
          };
          newComponents[targetParentNavId] = {
            ...targetNavNode,
            props: {
              ...targetNavNode.props,
              hasDropdown: true,
              dropdownItems: [...existingDropdownItems, newDropdownItem],
            },
          };
        }
      }

      const newPage: Page = {
        id: newPageId,
        name,
        slug: cleanSlug,
        rootNodeId: rootId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          title: `${name} | ${currentWebsite.name}`,
          description: `صفحة ${name} الرسمية في ${currentWebsite.name}`,
          slug: cleanSlug,
          isHomePage: false,
          robots: 'index, follow',
          placement,
          headerTitle: navText,
          parentNavId,
        },
      };

      const newWebsite: Website = {
        ...currentWebsite,
        pages: [...currentWebsite.pages, newPage],
        components: newComponents,
      };

      const placementLabel =
        placement === 'header_direct'
          ? 'في الهيدر مباشرة'
          : placement === 'header_dropdown'
            ? 'داخل قائمة منسدلة بالهيدر'
            : placement === 'header_and_footer'
              ? 'في الهيدر والفوتر'
              : 'صفحة مستقلة';

      recordHistory(`إضافة صفحة جديدة (${name}) - [${placementLabel}]`, newWebsite);
      setActivePageId(newPageId);
      setSelectedNodeId(rootId);
    },
    [website, websiteRef, recordHistory, setActivePageId, setSelectedNodeId]
  );

  const updatePagePlacement = useCallback(
    (
      pageId: string,
      opts: {
        placement: PagePlacementMode;
        headerTitle?: string;
        parentNavId?: string;
        dropdownDescription?: string;
        dropdownBadge?: string;
      }
    ) => {
      const currentWebsite = websiteRef?.current ?? website;
      const page = currentWebsite.pages.find((p) => p.id === pageId);
      if (!page) return;

      const newComponents = { ...currentWebsite.components };
      const navText = opts.headerTitle || page.name;
      const cleanSlug = page.slug;

      // 1. Remove any old direct nav links in header_nav pointing to this page
      const headerNav = newComponents['header_nav'];
      if (headerNav) {
        const filteredNavChildren = headerNav.childrenIds.filter((cId) => {
          const node = newComponents[cId];
          const matches = node?.props?.pageId === pageId || node?.props?.url === `/${cleanSlug}`;
          if (matches) {
            delete newComponents[cId];
            return false;
          }
          return true;
        });
        newComponents['header_nav'] = {
          ...headerNav,
          childrenIds: filteredNavChildren,
        };
      }

      // 2. Remove any old dropdown sub-items in all nav items pointing to this page
      Object.keys(newComponents).forEach((k) => {
        const comp = newComponents[k];
        if (comp.props?.dropdownItems && Array.isArray(comp.props.dropdownItems)) {
          const filtered = comp.props.dropdownItems.filter(
            (item: DropdownSubItem) => item.pageId !== pageId && item.url !== `/${cleanSlug}`
          );
          if (filtered.length !== comp.props.dropdownItems.length) {
            newComponents[k] = {
              ...comp,
              props: {
                ...comp.props,
                dropdownItems: filtered,
              },
            };
          }
        }
      });

      // 3. Add new placement
      if (opts.placement === 'header_direct' || opts.placement === 'header_and_footer') {
        const navLinkId = `nav_link_${pageId}`;
        const hNav = newComponents['header_nav'];
        if (hNav) {
          newComponents[navLinkId] = {
            id: navLinkId,
            name: `رابط ${navText}`,
            type: 'paragraph',
            category: 'typography',
            parentId: 'header_nav',
            childrenIds: [],
            props: {
              text: navText,
              url: `/${cleanSlug}`,
              pageId: pageId,
            },
            styles: {
              desktop: {
                fontSize: '15px',
                fontWeight: '500',
                textColor: '#475569',
              },
            },
          };
          newComponents['header_nav'] = {
            ...hNav,
            childrenIds: [...hNav.childrenIds, navLinkId],
          };
        }
      } else if (opts.placement === 'header_dropdown') {
        const targetParentNavId = opts.parentNavId || 'nav_link_2';
        const targetNavNode = newComponents[targetParentNavId];
        if (targetNavNode) {
          const existingDropdownItems: DropdownSubItem[] = targetNavNode.props.dropdownItems || [];
          const newDropdownItem: DropdownSubItem = {
            id: `sub_${pageId}`,
            title: navText,
            description: opts.dropdownDescription || `تصفح تفاصيل ${page.name}`,
            url: `/${cleanSlug}`,
            pageId: pageId,
            badge: opts.dropdownBadge || undefined,
          };
          newComponents[targetParentNavId] = {
            ...targetNavNode,
            props: {
              ...targetNavNode.props,
              hasDropdown: true,
              dropdownItems: [...existingDropdownItems, newDropdownItem],
            },
          };
        }
      }

      // Update page metadata
      const newPages = currentWebsite.pages.map((p) => {
        if (p.id === pageId) {
          return {
            ...p,
            metadata: {
              ...p.metadata,
              placement: opts.placement,
              headerTitle: navText,
              parentNavId: opts.parentNavId,
            },
          };
        }
        return p;
      });

      const newWebsite: Website = {
        ...currentWebsite,
        pages: newPages,
        components: newComponents,
      };

      recordHistory(`تحديث موضع ظهور صفحة (${page.name})`, newWebsite);
    },
    [website, websiteRef, recordHistory]
  );

  const deletePage = useCallback(
    (pageId: string) => {
      const currentWebsite = websiteRef?.current ?? website;
      const newWebsite = removePageAndOrphans(currentWebsite, pageId);
      if (newWebsite === currentWebsite) return;

      recordHistory(`حذف صفحة (${pageId})`, newWebsite);
      if (activePageId === pageId) {
        setActivePageId(newWebsite.pages[0].id);
        setSelectedNodeId(newWebsite.pages[0].rootNodeId);
      }
    },
    [website, websiteRef, activePageId, recordHistory, setActivePageId, setSelectedNodeId]
  );

  const updatePageMetadata = useCallback(
    (pageId: string, metaPatch: Partial<PageMetadata>) => {
      const currentWebsite = websiteRef?.current ?? website;
      const newPages = currentWebsite.pages.map((p) => {
        if (p.id === pageId) {
          return {
            ...p,
            metadata: {
              ...p.metadata,
              ...metaPatch,
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });

      const newWebsite: Website = {
        ...currentWebsite,
        pages: newPages,
      };

      recordHistory(`تحديث بيانات SEO للصفحة`, newWebsite);
    },
    [website, websiteRef, recordHistory]
  );

  return {
    activePage,
    switchPage,
    getHeaderDropdownNavItems,
    addPage,
    updatePagePlacement,
    deletePage,
    updatePageMetadata,
  };
};
