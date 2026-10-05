/*
 * ピザの日 招待サイト
 * 参考サイトの jQuery + Velocity の動きを、Web Animations API で組み直したもの
 */
(function () {
	'use strict';

	const ease = {
		linear: 'linear',
		easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
		easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
		easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
		easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
		easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)'
	};

	const $ = (sel, root) => (root || document).querySelector(sel);
	const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
	const isSP = () => window.matchMedia('(max-width: 767px)').matches;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// Velocity の .velocity({...}, {duration, delay, easing}) 相当。終わった状態を保持して Promise を返す
	function anim(el, keyframes, opt) {
		if (!el) return Promise.resolve();
		const a = el.animate(keyframes, {
			duration: reduced ? 0 : opt.duration,
			delay: reduced ? 0 : (opt.delay || 0),
			easing: opt.easing || ease.linear,
			fill: 'both'
		});
		return a.finished.then(() => {
			// 最終フレームを style に書き戻してアニメーションを解放する
			const last = keyframes[keyframes.length - 1];
			Object.keys(last).forEach((k) => { if (k !== 'offset' && k !== 'easing') el.style[k] = last[k]; });
			a.cancel();
		});
	}

	const body = document.body;
	const header = $('header');
	const loading = $('#loading');

	/*--------------------------------------------------------------------------------*/
	/* ローディング → ファーストビュー
	/*--------------------------------------------------------------------------------*/
	body.classList.add('noscroll');
	window.scrollTo(0, 0);
	if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

	function hideLoading() {
		anim(loading, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, delay: 150 }).then(() => { loading.style.display = 'none'; });
	}

	function topMain() {
		const top = $('.top-main');
		const first = $('.top-main .img-first');
		const last = $('.top-main .img-last');

		hideLoading();
		$('.contents').style.opacity = 1;

		// 1枚目：下から傾いて入ってくる
		anim($('.img1 figure', first),
			[{ opacity: 0, transform: 'translateY(100px) rotate(-8deg)' }, { opacity: 1, transform: 'translateY(0) rotate(0deg)' }],
			{ duration: 1200, delay: 300, easing: ease.easeOutQuart }
		).then(() => {
			// 2〜9枚目：左右交互にずれた位置から、次々に重なっていく
			const d1 = 250, d2 = 700, step = 180, rot = 5;
			const from = [[120, -200], [110, 180], [100, -160], [90, 140], [80, -120], [70, 100], [60, -80], [50, 60]];
			from.forEach(([mt, ml], i) => {
				const wrap = $('.img' + (i + 2), first);
				const r = (i % 2 === 0 ? -rot : rot);
				anim($('figure', wrap), [{ opacity: 0 }, { opacity: 1 }], { duration: d1, delay: step * i, easing: ease.easeOutCubic });
				anim(wrap,
					[{ transform: `translate(${ml}px, ${mt}px) rotate(${r}deg)` }, { transform: 'translate(0, 0) rotate(0deg)' }],
					{ duration: d2, delay: step * i, easing: ease.easeOutCubic });
			});

			// 最後の1枚：ストンと落ちてきて止まる
			anim(last, [{ opacity: 0, marginBottom: '-60px' }, { opacity: 1, marginBottom: '-30px' }], { duration: 200, delay: step * 7.5, easing: ease.easeInQuart })
				.then(() => anim(last, [{ marginBottom: '-30px' }, { marginBottom: '0px' }], { duration: 1000, easing: ease.easeOutQuart }))
				.then(() => {
					// 画面いっぱいに広がる（CSS の keyframes）
					first.style.opacity = 0;
					last.classList.add('active');

					// 縦書きタイトル：帯が伸びて、白いマスクが抜ける
					const spans = $$('.top-main h1 span');
					spans.forEach((span, i) => {
						const h = $('b', span).offsetHeight;
						anim(span, [{ height: '0px' }, { height: h + 'px' }], { duration: 500, delay: 100 + 200 * i, easing: ease.easeInOutQuart })
							.then(() => { span.style.height = 'auto'; }); // Webフォント読み込み後の文字幅の変化に追従させる
						anim($('.mask', span), [{ height: '100%' }, { height: '0%' }], { duration: 900, delay: 800 + 200 * i, easing: ease.easeOutQuart });
					});

					startSlide();

					anim(header, [{ opacity: 0 }, { opacity: 1 }], isSP()
						? { duration: 600, delay: 900, easing: ease.easeOutQuad }
						: { duration: 800, delay: 1200, easing: ease.easeOutQuad });
					body.classList.remove('noscroll');
				});
		});

		// SP はアドレスバーの伸び縮みで 100vh がずれるので、読み込み時の高さで固定する
		if (isSP() && window.innerHeight > 0) top.style.height = window.innerHeight + 'px';
	}

	// ファーストビューのフェードスライド（slick fade / speed 1200 / autoplaySpeed 4000 相当）
	function startSlide() {
		const slides = $$('.img-top-slide .slide');
		if (!slides.length) return;
		let idx = -1; // -1 = 広がった1枚目（img-last）を表示中
		setInterval(() => {
			idx = (idx + 1 > slides.length - 1) ? -1 : idx + 1;
			slides.forEach((s, i) => s.classList.toggle('is-current', i === idx));
		}, 4000 + 1200);
	}

	/*--------------------------------------------------------------------------------*/
	/* スクロール連動
	/*--------------------------------------------------------------------------------*/
	let scrollY = 0, winH = window.innerHeight;
	const offsetTop = (el) => el.getBoundingClientRect().top + window.scrollY;

	// ロゴ：スクロールしたらマークだけ残して縮む
	function animeHeader() {
		const logo = $('header .logo');
		const mark = $('header .logo .mark');
		if (isSP()) {
			const limit = winH - header.offsetHeight - parseInt(getComputedStyle(header).paddingTop, 10);
			const over = scrollY >= limit;
			logo.classList.toggle('active', over);
			mark.classList.toggle('absolute', !over);
		} else {
			logo.classList.toggle('active', scrollY >= 60);
			mark.classList.remove('absolute');
		}
	}

	// .img-fadein：下から 50px（SP 30px）浮かび上がる
	let fadeDelay = 0;
	function animeFadein() {
		$$('.img-fadein:not(.visible)').forEach((el) => {
			if (scrollY >= offsetTop(el) - winH + 100) {
				el.classList.add('visible');
				const y = isSP() ? 30 : 50;
				anim(el, [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'translateY(0)' }],
					{ duration: 1500, delay: fadeDelay, easing: ease.easeOutCubic });
				fadeDelay += 20;
			}
		});
	}

	// .top-about / .top-policy：テキストと写真が時間差で浮かぶ。葉っぱ・トマトは回転しながら舞い込む
	const common = { about: true, policy: true };
	function animeCommon() {
		const sp = isSP();
		const fromY = sp ? 30 : 50;
		const up = (el, delay) => anim(el,
			[{ opacity: 0, transform: `translateY(${fromY}px)` }, { opacity: 1, transform: 'translateY(0)' }],
			{ duration: 1500, delay, easing: ease.easeOutCubic });
		const fly = (el, x, r, delay) => anim(el,
			[{ opacity: 0, transform: `translate(${x}px, -60px) rotate(${r}deg)` }, { opacity: 1, transform: 'translate(0, 0) rotate(0deg)' }],
			{ duration: 1500, delay, easing: ease.easeOutCubic });

		const about = $('.top-about');
		if (common.about && scrollY >= offsetTop(about) - winH + 100) {
			common.about = false;
			up($('.txt', about), sp ? 300 : 0);
			up($('.pic1', about), sp ? 0 : 300);
			up($('.pic2', about), 600);
			fly($('.pic-fluff', about), 100, -60, 900);
		}
		const policy = $('.top-policy');
		if (common.policy && scrollY >= offsetTop(policy) - winH + 100) {
			common.policy = false;
			up($('.txt', policy), sp ? 600 : 300);
			up($('.img2', policy), 900);
			fly($('.pic-fluff', policy), -100, 60, 2100);
		}
	}

	// フッター：丘がせり上がり、鳥が降りて、ロゴが飛んできて、車が走り込む
	let footerSw = true;
	function animeFooter() {
		const footer = $('footer');
		if (!footerSw || scrollY < offsetTop(footer) - winH + (isSP() ? 400 : 600)) return;
		footerSw = false;
		anim($('.pic2', footer), [{ bottom: getComputedStyle($('.pic2', footer)).bottom }, { bottom: '0px' }], { duration: 1200, delay: 100, easing: ease.easeOutQuart });
		anim($('.bird', footer), [{ marginTop: getComputedStyle($('.bird', footer)).marginTop }, { marginTop: '0px' }], { duration: 1200, delay: 100, easing: ease.easeOutQuart });
		anim($('.airplane', footer), [{ opacity: 0, transform: 'translate(50px, 20px) rotate(20deg)' }, { opacity: 1, transform: 'translate(0, 0) rotate(0deg)' }], { duration: 1000, delay: 100, easing: ease.easeOutQuart });
		anim($('.train', footer), [{ opacity: 1, transform: 'translateX(400px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 1400, delay: 350, easing: ease.easeOutQuart });
	}

	function onScroll() {
		scrollY = window.scrollY;
		winH = window.innerHeight;
		animeHeader();
		animeFadein();
		animeCommon();
		animeFooter();
	}

	/*--------------------------------------------------------------------------------*/
	/* メンバー写真の無限スライド（infiniteslide 相当：左へ一定速度で流れ続ける）
	/*--------------------------------------------------------------------------------*/
	function infiniteSlide() {
		const wrap = $('.top-recruit-slide');
		// ファーストビューの写真（重なる9枚 → 全面の1枚 → スライド）を同じ順で複製する。幅と高さの変化は7枚周期
		$$('.top-main picture').forEach((pic, i) => {
			const fig = document.createElement('figure');
			fig.className = 'img' + (i % 7 + 1);
			fig.appendChild(pic.cloneNode(true));
			wrap.appendChild(fig);
		});
		const track = document.createElement('div');
		track.className = 'track';
		while (wrap.firstChild) track.appendChild(wrap.firstChild);
		wrap.appendChild(track);
		for (let i = 0; i < 2; i++) {
			const clone = track.cloneNode(true);
			clone.setAttribute('aria-hidden', 'true');
			wrap.appendChild(clone);
		}
		let x = 0, prev = performance.now();
		(function loop(now) {
			const speed = isSP() ? 30 : 40; // px / 秒
			x -= speed * (now - prev) / 1000;
			prev = now;
			const w = track.offsetWidth;
			if (w && -x >= w) x += w;
			wrap.style.transform = `translate3d(${x}px, 0, 0)`;
			requestAnimationFrame(loop);
		})(prev);
	}

	/*--------------------------------------------------------------------------------*/
	/* SP ナビ
	/*--------------------------------------------------------------------------------*/
	function navSP() {
		const btn = $('.btn-nav');
		const nav = $('.nav-sp');
		const toggle = (open) => {
			btn.classList.toggle('active', open);
			nav.classList.toggle('active', open);
			nav.setAttribute('aria-hidden', open ? 'false' : 'true');
			body.style.overflow = open ? 'hidden' : '';
		};
		btn.addEventListener('click', () => toggle(!nav.classList.contains('active')));
		$$('a', nav).forEach((a) => a.addEventListener('click', () => toggle(false)));
	}

	/*--------------------------------------------------------------------------------*/
	/* 起動
	/*--------------------------------------------------------------------------------*/
	infiniteSlide();
	navSP();

	window.addEventListener('load', () => {
		topMain();
		anim($('footer'), [{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: 300, easing: ease.easeOutQuad });
		onScroll();
	});
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll);
})();
