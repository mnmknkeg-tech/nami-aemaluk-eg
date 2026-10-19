import { useCallback, useMemo } from 'react';
import {
  AddPageOptions,
  DropdownSubItem,
  Page,
  PageMetadata,
  PagePlacementMode,
  Website,
} from '../../types/builder';

export interface UseBuilderPageOperationsProps {
  website: Website;
  activePageId: string;
  setActivePageId: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  recordHistory: (actionDesc: string, newWebsite: Website) => void;
}

export const useBuilderPageOperations = ({
  website,
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

      const newPageId = `page_${Date.now().toString(36)}`;
      const rootId = `root_${newPageId}`;
      const cleanSlug = (slug || name).toLowerCase().replace(/\s+/g, '-');
      const newComponents = { ...website.components };

      // Build template sections
      const pageSectionIds: string[] = [];
      const heroId = `hero_${newPageId}`;
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
        const filterId = `filter_${newPageId}`;
        const gridId = `grid_${newPageId}`;
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
        const productShowcaseId = `pdetail_${newPageId}`;
        const specsId = `pspecs_${newPageId}`;
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
        const authSectionId = `auth_sec_${newPageId}`;
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
        const authSectionId = `auth_sec_${newPageId}`;
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
        rootChildrenIds.push('comp_header');
      }
      rootChildrenIds.push(...pageSectionIds);
      if (includeHeaderFooter && newComponents['comp_footer']) {
        rootChildrenIds.push('comp_footer');
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
        const navLinkId = `nav_link_${newPageId}`;
        const headerNav = newComponents['header_nav'];
        if (headerNav) {
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
          newComponents['header_nav'] = {
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
            id: `sub_${newPageId}`,
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
          title: `${name} | ${website.name}`,
          description: `صفحة ${name} الرسمية في ${website.name}`,
          slug: cleanSlug,
          isHomePage: false,
          robots: 'index, follow',
          placement,
          headerTitle: navText,
          parentNavId,
        },
      };

      const newWebsite: Website = {
        ...website,
        pages: [...website.pages, newPage],
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
    },
    [website, recordHistory, setActivePageId]
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
      const page = website.pages.find((p) => p.id === pageId);
      if (!page) return;

      const newComponents = { ...website.components };
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
      const newPages = website.pages.map((p) => {
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
        ...website,
        pages: newPages,
        components: newComponents,
      };

      recordHistory(`تحديث موضع ظهور صفحة (${page.name})`, newWebsite);
    },
    [website, recordHistory]
  );

  const deletePage = useCallback(
    (pageId: string) => {
      if (website.pages.length <= 1) return; // Prevent deleting only page
      const newPages = website.pages.filter((p) => p.id !== pageId);
      const newWebsite: Website = {
        ...website,
        pages: newPages,
      };

      recordHistory(`حذف صفحة (${pageId})`, newWebsite);
      if (activePageId === pageId) {
        setActivePageId(newPages[0].id);
      }
    },
    [website, activePageId, recordHistory, setActivePageId]
  );

  const updatePageMetadata = useCallback(
    (pageId: string, metaPatch: Partial<PageMetadata>) => {
      const newPages = website.pages.map((p) => {
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
        ...website,
        pages: newPages,
      };

      recordHistory(`تحديث بيانات SEO للصفحة`, newWebsite);
    },
    [website, recordHistory]
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
