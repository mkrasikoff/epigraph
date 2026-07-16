package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.Quote;

import java.util.List;

/**
 * Builds the onboarding instruction quotes seeded into every new account right after registration
 * (AuthService.verify / AuthService.provisionOAuthUser → QuoteService.createDefaultQuotes).
 *
 * Static onboarding content that lives in code, same spirit as {@link
 * com.mkrasikoff.epigraph.achievement.AchievementCatalog} — but unlike a pure constant list it
 * mints fresh {@link Quote} entities on each call (each seeded quote needs its own identity,
 * timestamp and, later, a per-account userId assigned by the caller), so it's a factory rather
 * than a shared constant.
 *
 * The set is localized to the account's preferred language ("en" → English, anything else → the
 * Russian default), so an English-language account starts with English instructions. The three
 * quotes come back newest-first with descending {@code added} offsets (base+2, base+1, base) so
 * the "welcome" card sorts to the very top of a brand-new collection.
 */
public final class OnboardingQuotesFactory {

    private static final String AUTHOR = "Epigraph";
    private static final String TAG_RU = "инструкция";
    private static final String TAG_EN = "guide";

    private OnboardingQuotesFactory() {
    }

    /**
     * @param language      account's preferred language ("en" for the English set; any other value,
     *                      including null, falls back to Russian).
     * @param baseTimestamp epoch millis to anchor the seed quotes' ordering to (typically
     *                      {@code System.currentTimeMillis()} at registration time).
     */
    public static List<Quote> build(String language, long baseTimestamp) {
        return "en".equals(language) ? buildEnglish(baseTimestamp) : buildRussian(baseTimestamp);
    }

    private static List<Quote> buildRussian(long base) {
        return List.of(
                quote("⭐ Отмечайте любимые цитаты звёздочкой — они попадут в избранное. " +
                                "На вкладке «На сегодня» каждый день вас ждёт одна из ваших цитат. Удалите эти карточки, когда освоитесь.",
                        TAG_RU, base + 2),
                quote("➕ Чтобы добавить цитату, перейдите в раздел «Добавить». " +
                                "Укажите текст, автора, источник и теги — это поможет находить нужное через поиск.",
                        TAG_RU, base + 1),
                quote("👋 Добро пожаловать в Epigraph! Это ваше личное хранилище цитат. " +
                                "Сохраняйте фразы, которые вас вдохновляют, удивляют или заставляют думать.",
                        TAG_RU, base)
        );
    }

    private static List<Quote> buildEnglish(long base) {
        return List.of(
                quote("⭐ Star the quotes you love to add them to your Favorites. " +
                                "The Today tab shows you one of your quotes each day. Delete these cards once you've settled in.",
                        TAG_EN, base + 2),
                quote("➕ To add a quote, open the Add section. " +
                                "Enter the text, author, source and tags — they'll help you find it later with search.",
                        TAG_EN, base + 1),
                quote("👋 Welcome to Epigraph! This is your personal quote collection. " +
                                "Save the lines that inspire you, surprise you, or make you think.",
                        TAG_EN, base)
        );
    }

    private static Quote quote(String text, String tag, long added) {
        Quote q = new Quote();

        q.setText(text);
        q.setAuthor(AUTHOR);
        q.setTags(tag);
        q.setAdded(added);

        return q;
    }
}
