import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, FlatList,
  ActivityIndicator, Platform, ScrollView, Image, Modal, Animated,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '@/lib/query-client';
import { fetch } from 'expo/fetch';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';

const logoImage = require('@/assets/images/logo.png');

interface TextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

interface ListItem {
  children: TextNode[];
  childrenBlocks?: ContentBlock[];
}

interface DefinitionItem {
  term: string;
  definition: TextNode[];
}

interface EmojiDefinitionItem {
  emoji: string;
  term?: string;
  label?: string;
  definition?: TextNode[];
  description?: TextNode[];
}

interface ContentBlock {
  type: string;
  children?: TextNode[];
  items?: ListItem[] | DefinitionItem[] | EmojiDefinitionItem[];
  src?: string;
  alt?: string;
  caption?: string;
}

interface GuidePage {
  id: string;
  heading: string;
  content: ContentBlock[];
}

interface GuideLabel {
  name: string;
  description: string;
  pages: GuidePage[];
}

interface GuideData {
  title: string;
  version: number;
  type?: string;
  imageWidth?: number;
  imageHeight?: number;
  labels: GuideLabel[];
}

interface DynamoGuideItem {
  occupation: string;
  data: GuideData;
  version: number;
  lastModified: string;
}

const isTrue = (val: any): boolean => val === true || val === "true";

function normalizeToDynamoItem(parsed: any): DynamoGuideItem {
  if (parsed?.data?.labels) return parsed as DynamoGuideItem;
  const guide = Array.isArray(parsed) ? parsed[0] : parsed;
  return { occupation: '', data: guide, version: guide?.version || 1, lastModified: '' };
}

const GUIDE_CACHE_KEY = 'cached_guide_data_v4';
const GUIDE_VERSION_KEY = 'cached_guide_version_v4';

const SECTION_COLORS = [
  '#C2410C', '#6D28D9', '#0369A1', '#15803D',
  '#B45309', '#BE185D', '#1D4ED8', '#B91C1C',
  '#0E7490', '#4338CA', '#7E22CE', '#166534',
];

function getLabelIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('definition') || lower.includes('term')) return 'book-open-variant';
  if (lower.includes('identify') || lower.includes('red flag')) return 'flag-variant';
  if (lower.includes('slang') || lower.includes('emoji') || lower.includes('image')) return 'emoticon-outline';
  if (lower.includes('what to do') || lower.includes('what not')) return 'check-circle-outline';
  if (lower.includes('minimal') || lower.includes('interview')) return 'account-question';
  if (lower.includes('document')) return 'file-document-outline';
  if (lower.includes('code') || lower.includes('section')) return 'gavel';
  if (lower.includes('jury') || lower.includes('instruction')) return 'scale-balance';
  return 'file-document-outline';
}

function getSectionShortName(name: string): string {
  const map: Record<string, string> = {
    'Definition, Terms, & Translations': 'Definitions',
    'Identifying HT': 'Identifying',
    'Slang, Images, & Emojis': 'Slang',
    'What To Do': 'What To Do',
    'Minimal Facts Interview': 'Interview',
    'How To Document': 'Document',
    'Code Sections To Consider': 'Statutes',
    'Model Jury Instructions': 'Jury',
  };
  return map[name] || name.split(',')[0].trim();
}

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [guideData, setGuideData] = useState<DynamoGuideItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLabel, setActiveLabel] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const pdfScrollRef = useRef<ScrollView>(null);
  const [tabsExpanded, setTabsExpanded] = useState(false);
  const [expandedTOCSections, setExpandedTOCSections] = useState<Set<number>>(new Set([0]));
  const tabExpandAnim = useRef(new Animated.Value(0)).current;
  const contentRef = useRef<ScrollView>(null);
  const tocAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadGuide(); }, []);

  useEffect(() => {
    Animated.timing(tocAnim, {
      toValue: showTOC ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [showTOC]);

  useEffect(() => {
    Animated.timing(tabExpandAnim, {
      toValue: tabsExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [tabsExpanded]);

  const loadGuide = async () => {
    setIsLoading(true);
    try {
      const cached = await AsyncStorage.getItem(GUIDE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const item = normalizeToDynamoItem(parsed);
        setGuideData(item);
        setIsLoading(false);
      }
      await fetchAndCacheGuide();
    } catch {
      try { await fetchAndCacheGuide(); } catch { }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndCacheGuide = async () => {
    const baseUrl = getApiUrl();
    const url = new URL('/api/guide', baseUrl);
    const res = await fetch(url.toString(), { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch guide');
    const text = await res.text();
    if (!text || text === 'null') { setGuideData(null); return; }
    const parsed = JSON.parse(text);
    const item = normalizeToDynamoItem(parsed);
    await AsyncStorage.setItem(GUIDE_CACHE_KEY, JSON.stringify(item));
    await AsyncStorage.setItem(GUIDE_VERSION_KEY, String(item.version || 1));
    setGuideData(item);
  };

  const labels = useMemo(() => {
    if (!guideData?.data?.labels) return [];
    return guideData.data.labels.filter(l => l && l.name && Array.isArray(l.pages) && l.pages.length > 0);
  }, [guideData]);

  // Detect PDF image guides by type flag OR by checking if all content is image blocks
  const isPdfImageGuide = useMemo(() => {
    if (!guideData || labels.length === 0) return false;
    if (guideData.data?.type === 'pdf-images') return true;
    return labels.every(label =>
      label.pages.every(page =>
        page.content.length > 0 && page.content.every(block => block.type === 'image')
      )
    );
  }, [guideData, labels]);

  const allPages = useMemo(() => {
    return labels.flatMap((label, li) =>
      (label.pages || []).map((page, pi) => ({ ...page, labelIndex: li, pageIndex: pi, labelName: label.name }))
    );
  }, [labels]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allPages.filter(p => p.heading.toLowerCase().includes(q) || JSON.stringify(p.content).toLowerCase().includes(q));
  }, [allPages, searchQuery]);


  const pdfImageHeight = guideData?.data?.imageWidth && guideData?.data?.imageHeight
    ? screenWidth * (guideData.data.imageHeight / guideData.data.imageWidth)
    : screenWidth * (1182 / 788);
  const pdfSectionOffsets = useMemo(() => {
    if (!isPdfImageGuide) return [];
    let offset = 0;
    return labels.map(label => {
      const start = offset;
      offset += label.pages.length * pdfImageHeight;
      return start;
    });
  }, [isPdfImageGuide, labels, pdfImageHeight]);

  const handlePdfScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    let section = 0;
    for (let i = pdfSectionOffsets.length - 1; i >= 0; i--) {
      if (y >= pdfSectionOffsets[i] - pdfImageHeight * 0.3) {
        section = i;
        break;
      }
    }
    if (section !== activeLabel) setActiveLabel(section);
  }, [pdfSectionOffsets, pdfImageHeight, activeLabel]);

  const handleLabelSelect = useCallback((index: number) => {
    setActiveLabel(index);
    setSearchQuery('');
    setShowSearch(false);
    setShowTOC(false);
    if (isPdfImageGuide) {
      const y = pdfSectionOffsets[index] ?? 0;
      pdfScrollRef.current?.scrollTo({ y, animated: true });
    } else {
      contentRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [isPdfImageGuide, pdfSectionOffsets]);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([GUIDE_CACHE_KEY, GUIDE_VERSION_KEY]);
    await logout();
    router.replace('/');
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const tocTranslateY = tocAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] });
  const tocOpacity = tocAnim;

  if (isLoading) {
    return (
      <LinearGradient colors={['#1B4965', '#142F42']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading guide...</Text>
      </LinearGradient>
    );
  }

  if (!guideData) {
    return (
      <LinearGradient colors={['#1B4965', '#142F42']} style={styles.loadingContainer}>
        <MaterialCommunityIcons name="book-off-outline" size={52} color="rgba(255,255,255,0.3)" />
        <Text style={[styles.loadingText, { color: 'rgba(255,255,255,0.7)' }]}>No guide available for your role yet.</Text>
        <Pressable onPress={handleLogout} style={styles.logoutBtnStandalone}>
          <Ionicons name="log-out-outline" size={18} color="white" />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const currentLabel = labels[activeLabel];
  const pages = currentLabel?.pages || [];
  const sectionColor = SECTION_COLORS[activeLabel % SECTION_COLORS.length];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <LinearGradient
        colors={['#1B4965', '#142F42']}
        style={[styles.header, { paddingTop: insets.top + webTopInset }]}
      >
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
            <View>
              <Text style={styles.headerTitle}>Red Light Guide</Text>
              <Text style={styles.headerSub}>{currentLabel?.name || ''}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {!showSearch && (
              <Pressable onPress={() => setShowTOC(!showTOC)} style={[styles.headerBtn, showTOC && styles.headerBtnActive]}>
                <Ionicons name={showTOC ? "close" : "list"} size={20} color="white" />
              </Pressable>
            )}
            <Pressable
              onPress={() => { setShowSearch(!showSearch); setShowTOC(false); if (showSearch) setSearchQuery(''); }}
              style={[styles.headerBtn, showSearch && styles.headerBtnActive]}
            >
              <Ionicons name={showSearch ? "close" : "search"} size={20} color="white" />
            </Pressable>
            <Pressable onPress={handleLogout} style={styles.headerBtn}>
              <Ionicons name="log-out-outline" size={20} color="white" />
            </Pressable>
          </View>
        </View>

        {showSearch && (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.6)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search guide..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.6)" />
              </Pressable>
            ) : null}
          </View>
        )}

        {/* TOP SECTION TABS — collapsible 2-row grid */}
        {!showSearch && (
          <View style={styles.tabGridWrapper}>
            <View style={styles.tabGrid}>
              {(tabsExpanded ? labels : labels.slice(0, 5)).map((label, i) => {
                const color = SECTION_COLORS[i % SECTION_COLORS.length];
                const isActive = activeLabel === i;
                return (
                  <Pressable
                    key={i}
                    style={[styles.tab, isActive && { backgroundColor: color + '33' }]}
                    onPress={() => handleLabelSelect(i)}
                  >
                    <View style={[styles.tabIconWrap, { backgroundColor: isActive ? color : color + '55' }]}>
                      <MaterialCommunityIcons
                        name={getLabelIcon(label.name) as any}
                        size={18}
                        color="white"
                      />
                    </View>
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {getSectionShortName(label.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {labels.length > 5 && (
              <Pressable
                style={styles.tabExpandBtn}
                onPress={() => setTabsExpanded(prev => !prev)}
              >
                <View style={styles.tabExpandLine} />
                <Animated.View style={{ transform: [{ rotate: tabExpandAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                  <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.5)" />
                </Animated.View>
                <View style={styles.tabExpandLine} />
              </Pressable>
            )}
          </View>
        )}
      </LinearGradient>

      {/* BODY: TOC overlay + content */}
      <View style={{ flex: 1 }}>
        {/* TOC DROPDOWN */}
        {showTOC && (
          <Animated.View style={[styles.tocDropdown, { opacity: tocOpacity, transform: [{ translateY: tocTranslateY }] }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.tocTitle}>Table of Contents</Text>
              {labels.map((label, li) => {
                const color = SECTION_COLORS[li % SECTION_COLORS.length];
                const isExpanded = expandedTOCSections.has(li);
                return (
                  <View key={li} style={styles.tocSection}>
                    <Pressable
                      style={styles.tocSectionHeader}
                      onPress={() => {
                        setExpandedTOCSections(prev => {
                          const next = new Set(prev);
                          if (next.has(li)) next.delete(li);
                          else next.add(li);
                          return next;
                        });
                      }}
                    >
                      <View style={[styles.tocSectionDot, { backgroundColor: color }]} />
                      <Text style={styles.tocSectionName} numberOfLines={1}>{label.name}</Text>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={15} color="#6C757D" />
                    </Pressable>
                    {isExpanded && (
                      <View style={styles.tocPages}>
                        {(label.pages || []).map((page, pi) => (
                          <Pressable
                            key={pi}
                            style={styles.tocPageItem}
                            onPress={() => handleLabelSelect(li)}
                          >
                            <View style={[styles.tocPageDot, { backgroundColor: color + '60' }]} />
                            <Text style={styles.tocPageText} numberOfLines={2}>{page.heading}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* CONTENT */}
        {showSearch && searchQuery.trim() ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => `${item.labelIndex}-${item.pageIndex}`}
            contentContainerStyle={[styles.searchResults, { paddingBottom: insets.bottom + webBottomInset + 24 }]}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={44} color="#CED4DA" />
                <Text style={styles.emptySearchTitle}>No results</Text>
                <Text style={styles.emptySearchSub}>Try a different search term</Text>
              </View>
            }
            renderItem={({ item }) => {
              const color = SECTION_COLORS[item.labelIndex % SECTION_COLORS.length];
              return (
                <Pressable
                  style={styles.searchResultItem}
                  onPress={() => {
                    setActiveLabel(item.labelIndex);
                    setSearchQuery('');
                    setShowSearch(false);
                    contentRef.current?.scrollTo({ y: 0, animated: false });
                  }}
                >
                  <View style={[styles.searchResultIcon, { backgroundColor: color + '20' }]}>
                    <MaterialCommunityIcons name={getLabelIcon(item.labelName) as any} size={20} color={color} />
                  </View>
                  <View style={styles.searchResultContent}>
                    <Text style={styles.searchResultTitle}>{item.heading}</Text>
                    <Text style={styles.searchResultSub}>{item.labelName}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CED4DA" />
                </Pressable>
              );
            }}
          />
        ) : isPdfImageGuide ? (
          /* ── Seamless PDF page viewer ─────────────────────────────────────── */
          <ScrollView
            ref={pdfScrollRef}
            style={styles.contentScroll}
            contentContainerStyle={{ paddingBottom: insets.bottom + webBottomInset }}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={100}
            onScroll={handlePdfScroll}
            onScrollBeginDrag={() => { if (showTOC) setShowTOC(false); }}
          >
            {labels.flatMap((label) =>
              label.pages.map((page) => {
                const block = page.content[0];
                if (!block || block.type !== 'image' || !block.src) return null;
                const src = block.src.startsWith('/')
                  ? `${getApiUrl().replace(/\/$/, '')}${block.src}`
                  : block.src;
                const imgAspectRatio =
                  guideData?.data?.imageWidth && guideData?.data?.imageHeight
                    ? guideData.data.imageWidth / guideData.data.imageHeight
                    : 788 / 1182;
                return (
                  <Image
                    key={page.id}
                    source={{ uri: src }}
                    style={{ width: '100%', aspectRatio: imgAspectRatio }}
                    resizeMode="stretch"
                  />
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView
            ref={contentRef}
            style={styles.contentScroll}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + webBottomInset + 32 }]}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => { if (showTOC) setShowTOC(false); }}
          >
            {/* Section hero */}
            <View style={styles.sectionHero}>
              <View style={[styles.sectionHeroAccent, { backgroundColor: sectionColor }]} />
              <View style={[styles.sectionHeroIconWrap, { backgroundColor: sectionColor + '18' }]}>
                <MaterialCommunityIcons
                  name={getLabelIcon(currentLabel?.name || '') as any}
                  size={26}
                  color={sectionColor}
                />
              </View>
              <View style={styles.sectionHeroInfo}>
                <Text style={styles.sectionHeroName}>{currentLabel?.name}</Text>
                {currentLabel?.description ? (
                  <Text style={styles.sectionHeroDesc} numberOfLines={2}>{currentLabel.description}</Text>
                ) : null}
              </View>
              <View style={[styles.sectionHeroBadge, { backgroundColor: sectionColor + '15' }]}>
                <Text style={[styles.sectionHeroBadgeText, { color: sectionColor }]}>
                  {pages.length} {pages.length === 1 ? 'topic' : 'topics'}
                </Text>
              </View>
            </View>

            {/* All pages rendered continuously */}
            {pages.map((page, pageIndex) => {
              const isImagePage = page.content.length > 0 && page.content.every(b => b.type === 'image');
              return (
                <View key={page.id} style={styles.pageCard}>
                  <LinearGradient
                    colors={['#1E293B', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pageHeadingRow}
                  >
                    <View style={[styles.pageHeadingAccent, { backgroundColor: sectionColor }]} />
                    <View style={styles.pageHeadingContent}>
                      <Text style={styles.pageHeading} numberOfLines={3}>{page.heading}</Text>
                    </View>
                  </LinearGradient>
                  <View style={[styles.pageContent, isImagePage && styles.pageContentImage]}>
                    {page.content.map((block, bi) => (
                      <ContentBlockRenderer key={bi} block={block} sectionColor={sectionColor} />
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function RichText({ children }: { children: TextNode[] }) {
  if (!children || children.length === 0) return null;
  return (
    <Text>
      {children.map((node, i) => (
        <Text
          key={i}
          style={[
            richTextStyles.base,
            isTrue(node.bold) && richTextStyles.bold,
            isTrue(node.italic) && richTextStyles.italic,
          ]}
        >
          {node.text}
        </Text>
      ))}
    </Text>
  );
}

function ContentBlockRenderer({ block, sectionColor }: { block: ContentBlock; sectionColor: string }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <View style={blockStyles.paragraph}>
          <RichText>{block.children || []}</RichText>
        </View>
      );

    case 'callout':
      return (
        <View style={[blockStyles.callout, { backgroundColor: sectionColor + '12' }]}>
          <View style={[blockStyles.calloutBar, { backgroundColor: sectionColor }]} />
          <View style={blockStyles.calloutContent}>
            <RichText>{block.children || []}</RichText>
          </View>
        </View>
      );

    case 'numbered-list':
      return (
        <View style={blockStyles.listContainer}>
          {((block.items || []) as ListItem[]).map((item, i) => (
            <View key={i}>
              <View style={blockStyles.listItem}>
                <View style={[blockStyles.numberCircle, { backgroundColor: sectionColor }]}>
                  <Text style={blockStyles.numberText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <RichText>{item.children}</RichText>
                </View>
              </View>
              {item.childrenBlocks?.map((childBlock, j) => (
                <View key={j} style={{ marginLeft: 34 }}>
                  <ContentBlockRenderer block={childBlock} sectionColor={sectionColor} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );

    case 'bulleted-list':
      return (
        <View style={blockStyles.listContainer}>
          {((block.items || []) as ListItem[]).map((item, i) => (
            <View key={i}>
              <View style={blockStyles.listItem}>
                <View style={[blockStyles.bulletDot, { backgroundColor: sectionColor }]} />
                <View style={{ flex: 1 }}>
                  <RichText>{item.children}</RichText>
                </View>
              </View>
              {item.childrenBlocks?.map((childBlock, j) => (
                <View key={j} style={{ marginLeft: 16 }}>
                  <ContentBlockRenderer block={childBlock} sectionColor={sectionColor} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );

    case 'definition-list':
      return (
        <View style={blockStyles.defContainer}>
          {((block.items || []) as DefinitionItem[]).map((item, i) => (
            <View key={i} style={blockStyles.defItem}>
              <View style={[blockStyles.defTermRow, { backgroundColor: sectionColor + '18' }]}>
                <Text style={[blockStyles.defTerm, { color: sectionColor }]}>{item.term}</Text>
              </View>
              <View style={blockStyles.defBody}>
                <RichText>{item.definition}</RichText>
              </View>
            </View>
          ))}
        </View>
      );

    case 'emoji-definition-list':
      return (
        <View style={blockStyles.defContainer}>
          {((block.items || []) as EmojiDefinitionItem[]).map((item, i) => {
            const name = item.label || item.term || '';
            const desc = item.description || item.definition;
            return (
              <View key={i} style={blockStyles.emojiDefItem}>
                <Text style={blockStyles.emojiIcon}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  {name ? <Text style={[blockStyles.defTerm, { color: sectionColor }]}>{name}</Text> : null}
                  {desc && <RichText>{desc}</RichText>}
                </View>
              </View>
            );
          })}
        </View>
      );

    case 'image':
      if (block.src) {
        // Resolve relative API paths to absolute URLs
        const src = block.src.startsWith('/')
          ? `${getApiUrl().replace(/\/$/, '')}${block.src}`
          : block.src;
        return (
          <>
            <Image source={{ uri: src }} style={blockStyles.pdfPageImage} resizeMode="contain" />
            {block.caption && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={blockStyles.imageCaption}>{block.caption}</Text>
              </View>
            )}
          </>
        );
      }
      return null;

    default:
      return null;
  }
}

const richTextStyles = StyleSheet.create({
  base: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#343A40',
    lineHeight: 22,
  },
  bold: { fontFamily: 'Inter_700Bold' },
  italic: { fontStyle: 'italic' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  logoutBtnStandalone: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', marginTop: 8,
  },
  logoutBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: 'white' },

  header: {
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerLogo: { width: 34, height: 34 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: 'white', letterSpacing: -0.2 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: {
    width: 34, height: 34,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerBtnActive: { backgroundColor: 'rgba(255,255,255,0.22)' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'white',
  },

  tabGridWrapper: {
    paddingBottom: 4,
  },
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 0,
  },
  tabExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
  },
  tabExpandLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tab: {
    width: '20%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 3,
    borderRadius: 14,
    gap: 4,
  },
  tabIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 13,
  },
  tabTextActive: {
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },

  tocDropdown: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tocTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#1B4965',
    marginBottom: 12,
  },
  tocSection: { marginBottom: 4 },
  tocSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  tocSectionDot: { width: 10, height: 10, borderRadius: 5 },
  tocSectionName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#212529',
    flex: 1,
  },
  tocPages: { paddingLeft: 24, paddingBottom: 4 },
  tocPageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  tocPageDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  tocPageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#495057',
    flex: 1,
    lineHeight: 19,
  },

  contentScroll: { flex: 1 },
  contentContainer: { padding: 16, gap: 14 },

  sectionHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 18,
    overflow: 'hidden',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeroAccent: {
    width: 5,
    alignSelf: 'stretch',
  },
  sectionHeroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
  },
  sectionHeroInfo: {
    flex: 1,
    paddingVertical: 14,
  },
  sectionHeroName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionHeroDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 2,
  },
  sectionHeroBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 14,
  },
  sectionHeroBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },

  pageCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  pageHeadingRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 54,
  },
  pageHeadingAccent: {
    width: 4,
  },
  pageHeadingContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  pageHeading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: 'white',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  pageNumBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    margin: 12,
    marginLeft: 6,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pageNumText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  pageContent: { padding: 18, backgroundColor: '#FAFBFE' },
  pageContentImage: { padding: 0, backgroundColor: '#000' },

  searchResults: { padding: 14, gap: 8 },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchResultIcon: {
    width: 40, height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultContent: { flex: 1 },
  searchResultTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#212529' },
  searchResultSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6C757D', marginTop: 2 },

  emptySearch: { alignItems: 'center', paddingTop: 70, gap: 8 },
  emptySearchTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#ADB5BD' },
  emptySearchSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#CED4DA' },

});

const blockStyles = StyleSheet.create({
  paragraph: { marginBottom: 14 },

  callout: {
    flexDirection: 'row',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  calloutBar: { width: 5 },
  calloutContent: { flex: 1, padding: 14 },

  listContainer: { marginBottom: 14, gap: 10 },
  listItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bulletDot: {
    width: 9, height: 9,
    borderRadius: 5,
    marginTop: 7,
    flexShrink: 0,
  },
  numberCircle: {
    width: 24, height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  numberText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: 'white' },

  defContainer: { marginBottom: 14, gap: 10 },
  defItem: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  defTermRow: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 8,
  },
  defTerm: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#0F172A',
  },
  defBody: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 13,
    backgroundColor: '#FAFBFE',
  },

  emojiDefItem: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDF0F7',
    gap: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emojiIcon: { fontSize: 28, lineHeight: 34 },

  imageContainer: { marginBottom: 8, alignItems: 'center' },
  image: { width: '100%', height: 200, borderRadius: 14 },
  pdfPageImage: { width: '100%', aspectRatio: 8.5 / 11, borderRadius: 0 },
  imageCaption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6C757D',
    marginTop: 8,
    textAlign: 'center',
  },
});
