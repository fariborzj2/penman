export default {
  _dir: 'rtl',

  // Toolbar buttons and plugins
  plugins: {
    format: 'فرمت',
    image: {
      title: 'تصویر',
      insert: 'درج تصویر',
      urlTab: 'لینک مستقیم',
      uploadTab: 'آپلود',
      galleryTab: 'گالری',
      cancel: 'انصراف',
      upload: 'آپلود',
      uploadPlaceholder: 'تصاویر را اینجا رها کنید یا برای انتخاب کلیک کنید',
      insertSelected: 'درج انتخاب‌شده‌ها',
      clearQueue: 'حذف انتخاب‌شده‌ها',
      urlLabel: 'لینک تصویر',
      altLabel: 'متن جایگزین (اختیاری)',
      urlPlaceholder: 'https://...',
      altPlaceholder: 'متن جایگزین (اختیاری)',
      insertUrl: 'درج از لینک',
      galleryEmpty: 'تصویری در گالری یافت نشد.',
      galleryError: 'خطا در بارگذاری گالری: {error}',
      // Upload queue
      loading: 'در حال بارگذاری...',
      noSources: 'هیچ منبع گالری‌ای ثبت نشده است.',
      success: 'آپلود شد',
      error: 'خطا',
      failed: 'آپلود ناموفق بود',
      retry: 'تلاش مجدد',
      format: 'فرمت: ',
      size: 'حجم: ',
      copyLink: 'کپی لینک',
      loadMore: 'بارگذاری بیشتر',
      errorInit: 'خطا در راه‌اندازی گالری: {error}',
      invalidImageUrl: 'لینک تصویر نامعتبر است: {error}',
      noItemsToInsert: 'هیچ تصویر آپلودشده‌ای انتخاب نشده. لطفاً منتظر اتمام آپلود بمانید.',
      captionPlaceholder: 'توضیح تصویر را بنویسید...',
      uploading: 'در حال آپلود...',
      validationFailed: 'اعتبارسنجی فایل ناموفق بود',
      gallery: {
        errorNoId:          'منبع گالری نیاز به یک شناسه منحصربه‌فرد دارد.',
        errorNoList:        'منبع گالری نیاز به متد list() دارد.',
        errorNoGet:         'منبع گالری نیاز به متد get() دارد.',
        authFailed:         'احراز هویت گالری ناموفق بود.',
        notReady:           'منبع گالری هنوز آماده نیست.',
        invalidFormat:      'فرمت آیتم گالری نامعتبر است.',
        alreadyRegistered:  'یک منبع گالری با این شناسه قبلاً ثبت شده است.',
        notFound:           'منبع گالری یافت نشد.',
        invalidType:        'نوع فایل پشتیبانی نمی‌شود. لطفاً از PNG، JPEG یا WebP استفاده کنید.',
        fileTooLarge:       'حجم فایل بیش از حد مجاز است. حداکثر ۵ مگابایت.'
      },
      errors: {
        networkError:    'خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.',
        httpClientError: 'درخواست ناموفق بود. لطفاً آدرس را بررسی کرده و دوباره تلاش کنید.',
        httpServerError: 'خطای سرور. لطفاً کمی بعد دوباره تلاش کنید.',
        corsError:       'دسترسی توسط سرور رد شد (سیاست CORS).',
        timeout:         'زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید.',
        aborted:         'درخواست لغو شد.',
        parseError:      'پاسخ نامعتبر از سرور دریافت شد.',
        unauthorized:    'دسترسی رد شد. لطفاً مجوزهای خود را بررسی کنید.'
      }
    },
    blockType: {
      paragraph: 'پاراگراف',
      heading1: 'تیتر ۱',
      heading2: 'تیتر ۲',
      heading3: 'تیتر ۳',
      heading4: 'تیتر ۴',
      heading5: 'تیتر ۵',
      heading6: 'تیتر ۶',
      blockquote: 'نقل‌قول',
      pre: 'پیش‌فرمت',
      success: 'موفقیت',
      info: 'اطلاع',
      warning: 'هشدار',
      danger: 'خطر',
      searchPlaceholder: 'جستجو...'
    },
    media: {
      title: 'درج رسانه',
      directTab: 'لینک مستقیم',
      embedTab: 'جاسازی / سرویس‌ها',
      directPlaceholder: 'لینک ویدیو یا صدا را وارد کنید (mp4, webm, mp3...)',
      embedPlaceholder: 'لینک را وارد کنید (آپارات، یوتیوب...)',
      insert: 'درج',
      update: 'بروزرسانی',
      cancel: 'انصراف',
      autoplay: 'پخش خودکار',
      showControls: 'نمایش دکمه‌های کنترلی',
      posterPlaceholder: 'لینک تصویر پوستر (اختیاری)',
      editTitle: 'ویرایش رسانه',
      insertTitle: 'درج رسانه',
      invalidUrlPreview: 'یک لینک معتبر برای پیش‌نمایش وارد کنید',
      invalidEmbedUrl: 'لینک نامعتبر یا پشتیبانی‌نشده',
      invalidEmbedUrlMsg: 'این لینک توسط هیچ ارائه‌دهنده‌ای پشتیبانی نمی‌شود.',
      domainNotWhitelisted: 'دامنه مجاز نیست',
      domainNotWhitelistedMsg: 'این دامنه برای جاسازی سفارشی مجاز نیست.',
      embedTitlePlaceholder: 'عنوان رسانه برای iframe',
      mediaTitlePlaceholder: 'عنوان رسانه',
      invalidDirectUrl: 'لینک فایل نامعتبر است',
      invalidDirectUrlMsg: 'لینک به یک فرمت صوتی/تصویری پشتیبانی‌شده اشاره نمی‌کند.',
      directUrlLabel: 'لینک مستقیم فایل (.mp4, .mp3, غیره)',
      titleOptionalLabel: 'عنوان (اختیاری)',
      posterOptionalLabel: 'لینک تصویر پوستر (اختیاری)',
      mediaUrlLabel: 'لینک رسانه',
      autoDetectProvider: 'شناسایی خودکار سرویس‌دهنده',
      aspectRatio: 'نسبت تصویر',
      aspect169: '16:9 (عریض)',
      aspect43: '4:3 (استاندارد)',
      typeLabel: 'نوع',
      typeAuto: 'شناسایی خودکار',
      typeVideo: 'ویدیو',
      typeAudio: 'صدا',
      typeEmbed: 'جاسازی',
      livePreview: 'پیش‌نمایش زنده'
    },
    embed: {
      title: 'جاسازی HTML/Iframe',
      label: 'کد جاسازی (HTML/Iframe)',
      emptyError: 'لطفا کد جاسازی را وارد کنید.',
      invalidError: 'کد باید شامل یک تگ قابل جاسازی (مثل iframe, embed) باشد.'
    },
    audit: {
      title: 'بررسی محتوا',
      fix: 'راه‌حل',
      autoFix: 'رفع خودکار',
      allClear: 'هیچ مشکلی پیدا نشد',
      allClearDesc: 'محتوای شما همهٔ بررسی‌ها را با موفقیت گذرانده است.',
      scoreAria: 'امتیاز {score} از ۱۰۰',

      severity: {
        critical: 'بحرانی',
        warning: 'هشدار',
        suggestion: 'پیشنهاد',
        passed: 'موفق'
      },

      quality: {
        excellent: 'عالی',
        good: 'خوب',
        fair: 'متوسط',
        weak: 'ضعیف',
        poor: 'ناکافی'
      },

      categories: {
        seo: 'سئو',
        accessibility: 'دسترسی‌پذیری',
        readability: 'خوانایی',
        structure: 'ساختار',
        media: 'رسانه',
        links: 'لینک‌ها',
        performance: 'عملکرد',
        html: 'کیفیت HTML',
        security: 'امنیت'
      },

      stats: {
        words: 'کلمه',
        readTime: 'زمان مطالعه',
        readMinutes: '{count} دقیقه',
        headings: 'سرتیترها',
        images: 'تصاویر',
        internalLinks: 'لینک‌های داخلی',
        externalLinks: 'لینک‌های خارجی',
        issues: 'مشکلات',
        warnings: 'هشدارها'
      },

      loc: {
        topOfDoc: 'ابتدای سند',
        headingN: '{level} شمارهٔ {n}: «{text}»',
        charsCount: '{tag} ({count} کاراکتر)',
        wordsTotal: 'در مجموع {count} کلمه',
        wordsNoImages: '{count} کلمه، بدون تصویر',
        paragraphQuote: 'پاراگراف: «{text}»',
        imageN: 'تصویر #{n}: {src}',
        imageOnly: 'تصویر #{n}',
        iframeN: 'iframe #{n}',
        linkN: 'لینک #{n}: {href}',
        linkText: 'لینک #{n}: «{text}»',
        buttonN: 'دکمهٔ #{n}',
        tagN: '<{tag}> #{n}',
        paragraphWords: 'پاراگراف #{n} ({count} کلمه)',
        longSentences: '{count} جملهٔ طولانی',
        wordsNoHeadings: '{count} کلمه، بدون هیچ سرتیتر',
        noLists: 'هیچ <ul> یا <ol> در سند وجود ندارد',
        repeatedWord: 'تکراری: «{word}»',
        wordDensity: '«{word}» {count} بار تکرار شده ({pct}٪)',
        headingSkip: '{text} (پرش از H{from} به H{to})',
        emptyHeading: '{tag} خالی',
        duplicateHeading: 'تکرار: «{text}»',
        duplicateAlt: 'alt تکراری: «{alt}»',
        url: '{url}',
        weakAnchor: '«{text}» → {href}',
        duplicateLink: '«{text}» تکرار شده',
        brokenLink: 'شکسته: {url}',
        urlWithStatus: '{url} ({status})',
        imagesOnPage: '{count} تصویر در صفحه',
        htmlRatio: 'نسبت متن به HTML: {pct}٪',
        inlineStyleCount: '{count} عنصر دارای style درون‌خطی',
        nestedSameTag: '<{tag}> داخل <{tag}>',
        tagWithAttrs: '<{tag} {attrs}>'
      },

      linkCheck: {
        checking: 'در حال بررسی لینک‌ها… {done}/{total}'
      },

      rules: {
        // Async link-status checks
        'link-status-broken': {
          title: 'لینک شکسته (HTTP {status})',
          desc: 'سرور مقصد با کد خطای HTTP پاسخ داد.',
          why: 'لینک‌های شکسته کاربر را به صفحهٔ خطا می‌فرستند و به سئو آسیب می‌زنند.',
          fix: 'URL را بررسی کنید، مقصد را اصلاح کنید، یا لینک را حذف کنید.'
        },
        'link-status-timeout': {
          title: 'لینک پاسخ نداد (timeout)',
          desc: 'سرور مقصد در زمان تعیین‌شده پاسخی نداد.',
          why: 'مقصدهای کند یا غیرقابل دسترس کاربر را اذیت می‌کنند و ممکن است نشانهٔ outage باشند.',
          fix: 'URL را در مرورگر باز کنید تا مطمئن شوید کار می‌کند، یا با یک mirror سریع‌تر جایگزین کنید.'
        },
        'link-status-network': {
          title: 'لینک غیرقابل دسترس',
          desc: 'خطای شبکه یا CORS مانع بررسی این URL شد.',
          why: 'لینک‌های غیرقابل دسترس ممکن است نشان‌دهندهٔ سرور آفلاین یا مشکل DNS باشند.',
          fix: 'URL را دستی بررسی کنید. اگر سرور CORS را block می‌کند، این check نمی‌تواند اجرا شود؛ از یک proxy سمت سرور استفاده کنید.'
        },


        // SEO
        'seo-no-h1': {
          title: 'سرتیتر H1 وجود ندارد',
          desc: 'هیچ سرتیتر سطح اولی برای تعریف موضوع صفحه وجود ندارد.',
          why: 'موتورهای جستجو و screen reader ها برای درک موضوع صفحه به H1 متکی هستند.',
          fix: 'یک H1 در ابتدای محتوا اضافه کنید که موضوع اصلی را توصیف کند.'
        },
        'seo-multiple-h1': {
          title: 'چند سرتیتر H1',
          desc: 'هر صفحه باید دقیقاً یک H1 داشته باشد.',
          why: 'وجود چندین H1 سیگنال موضوعی صفحه را برای موتورهای جستجو ضعیف می‌کند.',
          fix: 'H1 های اضافی را در صورت لزوم به H2 یا H3 تبدیل کنید.'
        },
        'seo-h1-too-long': {
          title: 'H1 بیش از حد طولانی است',
          desc: 'سرتیتر H1 باید مختصر باشد (کمتر از ۷۰ کاراکتر).',
          why: 'H1 های طولانی در نتایج جستجو truncate می‌شوند و خوانایی را کاهش می‌دهند.',
          fix: 'H1 را به ضروری‌ترین عبارت آن خلاصه کنید.'
        },
        'seo-content-too-short': {
          title: 'محتوا بسیار کوتاه است',
          desc: 'این سند کمتر از ۱۰۰ کلمه دارد.',
          why: 'محتوای کم‌حجم به‌ندرت رتبهٔ خوبی می‌گیرد و اغلب «بی‌ارزش» شناخته می‌شود.',
          fix: 'حداقل ۳۰۰ کلمه محتوای معنادار در هر صفحه قرار دهید.'
        },
        'seo-no-images': {
          title: 'محتوای طولانی بدون تصویر',
          desc: 'مقاله‌های طولانی از تصاویر پشتیبان بهره می‌برند.',
          why: 'تصاویر زمان ماندگاری و سیگنال‌های موضوعی را بهبود می‌بخشند.',
          fix: 'حداقل یک تصویر مرتبط به مقاله‌های بالای ۵۰۰ کلمه اضافه کنید.'
        },
        'seo-placeholder-text': {
          title: 'متن جایگزین شناسایی شد',
          desc: 'محتوا حاوی lorem ipsum یا نشانه‌های TODO است.',
          why: 'انتشار متن جایگزین به اعتبار و سئو لطمه می‌زند.',
          fix: 'پیش از انتشار، متن جایگزین را با محتوای واقعی جایگزین کنید.'
        },

        // Accessibility
        'a11y-img-missing-alt': {
          title: 'تصویر بدون متن جایگزین',
          desc: 'تصویر فاقد attribute alt است.',
          why: 'screen reader ها نمی‌توانند تصویر بدون alt را اعلام کنند. تصاویر تزئینی باید از alt="" استفاده کنند.',
          fix: 'یک alt توصیفی اضافه کنید، یا برای تصاویر تزئینی از alt="" استفاده کنید.'
        },
        'a11y-iframe-no-title': {
          title: 'iframe بدون title',
          desc: 'iframe فاقد attribute title توصیفی است.',
          why: 'screen reader ها iframe ها را با title آنها اعلام می‌کنند.',
          fix: 'یک title اضافه کنید که محتوای iframe را توضیح دهد.'
        },
        'a11y-empty-link': {
          title: 'لینک بدون نام قابل دسترس',
          desc: 'لینک نه متن دارد و نه aria-label.',
          why: 'لینک‌های بدون متن برای کاربران screen reader غیرقابل دسترس هستند.',
          fix: 'متن قابل مشاهده یا aria-label به لینک اضافه کنید.'
        },
        'a11y-button-no-label': {
          title: 'دکمه بدون متن',
          desc: 'یک دکمه نه متن دارد و نه aria-label.',
          why: 'screen reader ها دکمهٔ خالی را بدون هدف اعلام می‌کنند.',
          fix: 'متن قابل مشاهده یا aria-label به هر دکمه اضافه کنید.'
        },
        'a11y-input-no-label': {
          title: 'ورودی فرم بدون label',
          desc: 'یک input فاقد <label> یا aria-label متصل است.',
          why: 'ورودی‌های بدون label برای کاربران screen reader و کنترل صوتی غیرقابل دسترس هستند.',
          fix: 'ورودی‌ها را داخل <label> قرار دهید یا aria-label/aria-labelledby اضافه کنید.'
        },

        // Readability
        'read-long-paragraph': {
          title: 'پاراگراف بسیار طولانی',
          desc: 'پاراگراف بیش از ۱۵۰ کلمه دارد.',
          why: 'پاراگراف‌های طولانی خوانندگان را می‌ترسانند و رد می‌شوند.',
          fix: 'پاراگراف را در نقاط طبیعی به چند پاراگراف کوتاه‌تر تقسیم کنید.'
        },
        'read-long-sentence': {
          title: 'جملهٔ بسیار طولانی',
          desc: 'یک یا چند جمله بیش از ۳۵ کلمه دارند.',
          why: 'جملات بالای ۳۰ کلمه دنبال کردن را دشوار می‌کنند.',
          fix: 'جملات طولانی را به جملات کوتاه و متمرکز تقسیم کنید.'
        },
        'read-no-headings': {
          title: 'محتوای طولانی بدون زیر سرتیتر',
          desc: 'مقالهٔ طولانی (بالای ۴۰۰ کلمه) بدون هیچ سرتیتر.',
          why: 'زیرسرتیترها مانند تابلوهای راهنما عمل می‌کنند و محتوا را قابل مرور می‌سازند.',
          fix: 'مقاله را با H2 یا H3 به بخش‌های منطقی تقسیم کنید.'
        },
        'read-no-lists': {
          title: 'محتوای طولانی بدون لیست',
          desc: 'سند طولانی است اما هیچ لیستی ندارد.',
          why: 'لیست‌ها قابلیت مرور سریع اطلاعات ترتیبی یا قابل شمارش را بهبود می‌بخشند.',
          fix: 'هر جا در متن چیزی را فهرست می‌کنید، از <ul> یا <ol> واقعی استفاده کنید.'
        },
        'read-repeated-word': {
          title: 'کلمهٔ تکراری',
          desc: 'یک کلمه دو یا چند بار پشت سر هم آمده است.',
          why: 'تکرار کلمه پشت سر هم تقریباً همیشه یک تایپو است.',
          fix: 'کلمهٔ تکراری را حذف کنید.'
        },
        'read-keyword-density': {
          title: 'احتمال keyword stuffing',
          desc: 'یک کلمه بیش از ۶٪ کل متن را تشکیل می‌دهد.',
          why: 'تکرار بیش از حد یک کلمه ناهنجار خوانده می‌شود و ممکن است منجر به جریمهٔ سئو شود.',
          fix: 'از مترادف‌ها استفاده کنید یا بخش‌هایی را که کلمه غالب است بازنویسی کنید.'
        },

        // Structure
        'struct-heading-skip': {
          title: 'پرش از سطح سرتیتر',
          desc: 'سطوح سرتیتر پرش دارند (مثلاً H2 و بعد H4 بدون H3).',
          why: 'پرش از سطوح کاربران screen reader را گیج می‌کند.',
          fix: 'سطوح سرتیتر را طوری تنظیم کنید که هر بار فقط یک سطح پایین بیایند.'
        },
        'struct-empty-heading': {
          title: 'سرتیتر خالی',
          desc: 'سرتیتر هیچ متن قابل مشاهده‌ای ندارد.',
          why: 'سرتیترهای خالی به‌صورت فاصله‌های ساکت برای screen reader ها ظاهر می‌شوند.',
          fix: 'سرتیتر خالی را حذف کنید یا متن معنادار اضافه کنید.'
        },
        'struct-duplicate-heading': {
          title: 'متن سرتیتر تکراری',
          desc: 'دو یا چند سرتیتر متن یکسانی دارند.',
          why: 'سرتیترهای تکراری ارزش فهرست مطالب را کاهش می‌دهند.',
          fix: 'سرتیترها را متمایز کنید تا هر بخش عنوان منحصربه‌فردی داشته باشد.'
        },

        // Media
        'media-img-no-dimensions': {
          title: 'تصویر بدون width/height',
          desc: 'تصویر فاقد attribute های صریح width و height است.',
          why: 'بدون ابعاد مشخص، مرورگر پس از بارگذاری تصویر باید layout را reflow کند که باعث layout shift می‌شود.',
          fix: 'attribute های width و height را مطابق ابعاد اصلی تصویر تنظیم کنید.'
        },
        'media-img-no-lazy': {
          title: 'تصویر بدون lazy loading',
          desc: 'تصویر فاقد loading="lazy" است.',
          why: 'lazy loading بارگذاری تصاویر خارج از viewport را به تعویق می‌اندازد و عملکرد بارگذاری اولیه را بهبود می‌بخشد.',
          fix: 'به تصاویری که در viewport اول نیستند loading="lazy" اضافه کنید.'
        },
        'media-duplicate-alt': {
          title: 'alt تکراری تصویر',
          desc: 'چند تصویر متن alt یکسانی دارند.',
          why: 'alt های تکراری screen reader ها را گیج می‌کنند و ممکن است نشانهٔ اشتباه copy-paste باشند.',
          fix: 'به هر تصویر یک alt منحصربه‌فرد و توصیفی بدهید.'
        },

        // Links
        'link-malformed': {
          title: 'لینک شکسته یا نامعتبر',
          desc: 'href لینک یک URL معتبر نیست (فاصله، scheme شکسته، hostname نامعتبر، یا خط تیرهٔ انتهایی).',
          why: 'لینک‌های نامعتبر کاربر را به صفحهٔ خطا می‌فرستند، به سئو آسیب می‌زنند و ممکن است فیلترهای امنیتی را دور بزنند.',
          fix: 'URL را اصلاح کنید — فاصله‌ها را حذف کنید، scheme را درست کنید (http:// یا https://)، و از معتبر بودن domain اطمینان حاصل کنید.'
        },
        'link-empty-href': {
          title: 'لینک با href خالی',
          desc: 'anchor فاقد href است، یا href فقط "#" است.',
          why: 'این لینک‌ها به جایی نمی‌روند و کاربر را گیج می‌کنند.',
          fix: 'یک href معنادار اضافه کنید یا به <button> تبدیل کنید.'
        },
        'link-http': {
          title: 'لینک ناامن http://',
          desc: 'لینک از http به جای https استفاده می‌کند.',
          why: 'ترافیک HTTP رمزگذاری نشده است و ممکن است توسط مرورگرهای مدرن مسدود شود.',
          fix: 'در صورت امکان از https استفاده کنید.'
        },
        'link-weak-anchor': {
          title: 'متن anchor ضعیف',
          desc: 'لینک از متن عمومی مانند «اینجا کلیک کنید» یا «بیشتر بخوانید» استفاده می‌کند.',
          why: 'anchor های توصیفی به سئو و کاربران screen reader که با لینک‌ها مرور می‌کنند کمک می‌کنند.',
          fix: 'متن لینک را با عبارتی که مقصد را توصیف می‌کند جایگزین کنید.'
        },
        'link-duplicate': {
          title: 'لینک‌های تکراری',
          desc: 'دو یا چند لینک href و متن قابل مشاهدهٔ یکسانی دارند.',
          why: 'لینک‌های تکراری به‌ندرت ارزش افزوده‌ای دارند و navigation را شلوغ می‌کنند.',
          fix: 'یک نسخهٔ اصلی نگه دارید و تکراری‌ها را حذف کنید.'
        },
        'link-external-no-rel': {
          title: 'لینک خارجی بدون rel="noopener"',
          desc: 'لینک خارجی با target="_blank" باز می‌شود اما rel="noopener" ندارد.',
          why: 'بدون rel="noopener"، لینک‌های target="_blank" صفحهٔ شما را در معرض tab-napping قرار می‌دهند.',
          fix: 'به لینک‌های خارجی _blank صفت rel="noopener" (یا noopener noreferrer) اضافه کنید.'
        },

        // Performance
        'perf-large-images': {
          title: 'تعداد زیاد تصویر بزرگ',
          desc: 'صفحه بیش از ۱۰ تصویر دارد.',
          why: 'صفحات با تصاویر زیاد بارگذاری کندتری دارند، به‌ویژه روی شبکهٔ موبایل.',
          fix: 'از lazy loading استفاده کنید، تصاویر را فشرده کنید، و به srcset پاسخگو فکر کنید.'
        },
        'perf-html-bloat': {
          title: 'نسبت متن به HTML پایین',
          desc: 'کمتر از ۲۵٪ بایت‌های رندر شده، متن قابل مشاهده هستند.',
          why: 'markup اضافی parsing را کند می‌کند و حجم payload را افزایش می‌دهد.',
          fix: 'wrapper های اضافی، style های inline، و عناصر خالی را حذف کنید.'
        },

        // HTML Quality
        'html-empty-elements': {
          title: 'عناصر خالی',
          desc: 'عناصر inline مانند <strong>، <em>، <span> بدون محتوا وجود دارند.',
          why: 'عناصر inline خالی نویز markup ایجاد می‌کنند بدون تأثیر بر رندر.',
          fix: 'هنگام cleanup عناصر inline خالی را حذف کنید.'
        },
        'html-excessive-inline-style': {
          title: 'style های درون‌خطی بیش از حد',
          desc: 'عناصر زیادی از attribute style استفاده می‌کنند.',
          why: 'style های inline نگهداری و override آن دشوار است؛ کلاس‌های CSS را ترجیح دهید.',
          fix: 'style های تکراری inline را به کلاس‌های CSS قابل استفادهٔ مجدد منتقل کنید.'
        },
        'html-nested-same-tag': {
          title: 'تگ‌های inline یکسان تو در تو',
          desc: 'یک <strong> داخل <strong> (یا em-in-em و غیره) هیچ کاری نمی‌کند.',
          why: 'تو در تو شدن اضافی markup را بدون اثر بصری افزایش می‌دهد.',
          fix: 'تکرارهای تو در تو را flatten کنید.'
        },

        // Security
        'sec-inline-event': {
          title: 'attribute event handler درون‌خطی',
          desc: 'یک عنصر event handler درون‌خطی دارد (onclick، onerror، …).',
          why: 'handler های inline یک vector رایج XSS هستند و CSP را دور می‌زنند.',
          fix: 'handler را حذف کنید — رفتار را در JavaScript بنویسید.'
        },
        'sec-javascript-href': {
          title: 'لینک javascript:',
          desc: 'لینک از scheme javascript: استفاده می‌کند.',
          why: 'href های javascript: کد دلخواه را اجرا می‌کنند و یک vector XSS رایج هستند.',
          fix: 'با یک URL واقعی جایگزین کنید یا handler JS اتصال دهید.'
        },
        'sec-iframe-unsafe-src': {
          title: 'iframe با src غیر https',
          desc: 'src iframe روی https نیست.',
          why: 'محتوای مخلوط از iframe های http توسط مرورگرهای مدرن مسدود می‌شود و ممکن است شنود شود.',
          fix: 'از نسخهٔ https آدرس embed استفاده کنید.'
        }
      }
    },
    draft: {
      recoveryBannerMsg: 'یک نسخه ذخیره‌ شده جدیدتر از این سند یافت شد.',
      lastAutoSaved: 'آخرین ذخیره خودکار: ',
      restoreDraft: 'بازیابی پیش‌نویس',
      discard: 'انصراف',
      draftRestored: 'پیش‌نویس بازیابی شد.',
      draftDiscarded: 'پیش‌نویس لغو شد.',
      saving: 'در حال ذخیره...',
      draftSaved: 'پیش‌نویس ذخیره شد.',
    },
    suggestedPosts: {
      titlePlaceholder: 'عنوان پست پیشنهادی را وارد کنید',
      postsAdded: 'پست اضافه‌شده',
      fillBothFields: 'لطفاً هر دو فیلد را پر کنید.',
      invalidUrl: 'لینک واردشده نامعتبر است.',
      addLink: 'افزودن لینک',
      saveChanges: 'ذخیره تغییرات',
      minOnePost: 'لطفاً حداقل یک پست اضافه کنید.',
      title: 'پست‌های پیشنهادی',
      lable: 'عنوان پست پیشنهادی',
      searchPlaceholder: 'جستجوی پست‌ها...',
      insert: 'افزودن مطلب',
      cancel: 'انصراف',
      noResults: 'پستی یافت نشد.',
      loading: 'در حال بارگذاری...'
    },
    fontSize: {
      title: 'اندازه قلم'
    },
    codeBlock: {
      title: 'بلوک کد'
    },
    sourceCode: {
      title: 'کد منبع',
      apply: 'اعمال تغییرات',
      cancel: 'انصراف',
      searchPlaceholder: 'جستجو...',
      unsavedChanges: 'تغییرات ذخیره‌نشده دارید. آیا مطمئن هستید که می‌خواهید ببندید؟'
    },
    direction: {
      rtl: 'راست‌چین (RTL)',
      ltr: 'چپ‌چین (LTR)',
      auto: 'جهت خودکار'
    },
    list: {
      bullet: 'لیست نشانه‌دار',
      numbered: 'لیست شماره‌دار',
      indent: 'افزایش تو رفتگی',
      outdent: 'کاهش تو رفتگی'
    },
    hr: {
      title: 'درج خط افقی'
    },
    removeFormat: {
      title: 'پاک کردن فرمت'
    },
    findReplace: {
      title: 'جستجو و جایگزینی',
      find: 'جستجو',
      replace: 'جایگزینی',
      replaceAll: 'جایگزینی همه',
      next: 'بعدی',
      prev: 'قبلی',
      findPlaceholder: 'متن جستجو...',
      replacePlaceholder: 'جایگزینی با...',
      matchCase: 'حساس به حروف',
      ignoreDiacritics: 'نادیده گرفتن اعراب (RTL)',
      allWords: 'همه موارد',
      noMatch: 'نتیجه‌ای یافت نشد.'
    },
    link: {
      insert: 'درج پیوند',
      unlink: 'حذف پیوند',
      lable: 'لینک مطلب',
      urlPlaceholder: 'https://example.com',
      textPlaceholder: 'متن نمایشی',
      openInNewTab: 'باز شدن در پنجره جدید',
      save: 'ذخیره',
      cancel: 'انصراف',
      relPlaceholder: 'مثلا nofollow',
      urlLabel: 'لینک',
      relLabel: 'ارتباط (Rel)',
      textLabel: 'متن نمایشی',
      targetLabel: 'مقصد',
      targetNone: 'هیچ‌کدام',
      targetBlank: 'پنجره جدید (_blank)',
      targetSelf: 'همان پنجره (_self)',
      targetParent: 'فریم والد (_parent)',
      targetTop: 'بالاترین فریم (_top)'
    },
    color: {
      textColor: 'رنگ متن',
      highlight: 'رنگ پس‌زمینه',
      clear: 'حذف رنگ'
    },
    table: {
      title: 'جدول',
      insertRowAbove: 'درج سطر در بالا',
      insertRowBelow: 'درج سطر در پایین',
      insertColLeft: 'درج ستون در چپ',
      insertColRight: 'درج ستون در راست',
      deleteRow: 'حذف سطر',
      deleteCol: 'حذف ستون',
      deleteTable: 'حذف جدول',
      cell: 'سلول',
      mergeCells: 'ادغام سلول‌ها',
      splitCell: 'تقسیم سلول',
      row: 'سطر',
      column: 'ستون',
      properties: 'تنظیمات جدول',
      selectTable: 'انتخاب جدول',
      widthPlaceholder: 'مثلا 100% یا 500px',
      borderPlaceholder: 'مثلا 1 یا 0',
      borderColorPlaceholder: 'مثلا #000 یا red',
      cellPaddingPlaceholder: 'مثلا 5',
      cellSpacingPlaceholder: 'مثلا 0',
      widthLabel: 'عرض:',
      borderLabel: 'حاشیه:',
      borderColorLabel: 'رنگ حاشیه:',
      cellPaddingLabel: 'فاصله داخلی سلول:',
      cellSpacingLabel: 'فاصله خارجی سلول:',
      directionLabel: 'جهت:',
      defaultDir: 'پیش‌فرض',
      ltr: 'چپ‌چین (LTR)',
      rtl: 'راست‌چین (RTL)',
      alignmentLabel: 'تراز:',
      alignLeft: 'چپ',
      alignCenter: 'وسط',
      alignRight: 'راست',
      cellBackgroundColor: 'رنگ پس‌زمینه سلول',
      mergeError: 'ادغام امکان‌پذیر نیست: سلول‌های انتخاب‌شده یک مستطیل کامل را تشکیل نمی‌دهند.'
    }
  },

  // General commands / core
  core: {
    undo: 'بازگردانی',
    redo: 'انجام دوباره',
    bold: 'ضخیم',
    italic: 'کج',
    underline: 'زیرخط',
    strikethrough: 'خط‌خورده',
    superscript: 'بالانویس',
    subscript: 'پایین‌نویس',
    justifyLeft: 'چپ‌چین',
    justifyCenter: 'وسط‌چین',
    justifyRight: 'راست‌چین',
    justifyFull: 'تراز کامل'
  },

  // UI Elements
  ui: {
    save: 'ذخیره',
    cancel: 'انصراف',
    close: 'بستن',
    insert: 'درج',
    delete: 'حذف',
    edit: 'ویرایش',
    ok: 'تایید',
    confirm: 'تأیید',
    discard: 'دور انداختن تغییرات',
    error: 'خطا',
    info: 'اطلاعات',
    dialog: 'پنجره',
    stats: 'تعداد کلمات: {words} | تعداد کاراکترها: {chars}'
  }
};
