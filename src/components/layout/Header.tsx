'use client'

import { useAuth } from '@/hooks/use-auth'

/**
 * サイト共通ヘッダー（デザイン home_10 の components/header.html 由来）
 *
 * - 全ページで使い回す（トップページ含む）
 * - #header ラッパーが position: fixed（style/header.css）。
 *   トップページ以外はヘッダー高さ分のスペーサーで内容を下げる
 *   （トップは背景に重ねるデザインのため globals.css 側で非表示）
 * - .guest / .login / .writer の表示切替は CSS（body[data-auth] / [data-view]）が担当
 * - メニュー開閉・テーマ / ビュートグルの挙動は public/site.js が担当
 * - アバターと表示名のみクライアントで取得（useAuth）
 * - 開発用のログイン切替（.sn_dev / #auth-toggle）は削除済み
 * - 旧ヘッダー互換のため profile / user props を受け取るが使用しない
 *   （表示は body[data-auth] と useAuth で決まる）
 */
export default function Header(_legacyProps: { profile?: unknown; user?: unknown; activeGenre?: unknown } = {}) {
    const { profile } = useAuth()

    const avatarStyle = profile?.icon_url
        ? { backgroundImage: `url(${profile.icon_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : undefined

    return (
        <>
        <div id="header">
        <header>
            <h1>
                <a href="/">
                    <img src="/home/img/logo/light_mode.svg" alt="原石航路" className="light" />
                    <img src="/home/img/logo/dark_mode.svg" alt="原石航路" className="dark" />
                </a>
            </h1>
            <nav>
                <ul className="main_nav">
                    <li><a href="/about">原石航路とは</a></li>
                    <li><a href="/search">作品を探す</a></li>
                    <li className="guest nav_signup"><a href="/auth/register" className="oct_fill">新規登録</a></li>
                    <li className="guest nav_login"><a href="/auth/login" className="oct_line">ログイン</a></li>
                    <li className="login">
                        <a href="/post" className="nav_post oct_line icn_chip" data-set-view="writer" aria-label="作品を投稿する">
                            <span className="icn icn_pen"></span>
                        </a>
                    </li>
                    <li className="login">
                        <a href="/mypage/messages" className="nav_bell oct_line icn_chip" aria-label="通知">
                            <span className="icn icn_bell"></span>
                        </a>
                    </li>
                    <li className="login">
                        <a href="/mypage" className="nav_avatar" aria-label="マイページ" style={avatarStyle}></a>
                    </li>
                    <li> {/* ハンバーガーメニュー */}
                        <a href="#" className="nav_menu_open" aria-label="メニュー"><span className="icn icn_menu"></span></a>
                        <div className="sub_nav">
                            <ul>
                                <li className="sn_head">
                                    <a href="/" className="sn_logo"><img src="/home/img/logo/dark_mode.svg" alt="原石航路" /></a>
                                    <button className="nav_menu_close" aria-label="閉じる"><span className="icn icn_close"></span></button>
                                </li>
                                <li>
                                    <a href="/search" className="nav_link">作品を探す</a>
                                    <ul>
                                        <li><a href="/ranking">ランキング</a></li>
                                    </ul>
                                </li>
                                <li className="sn_gap" aria-hidden="true"></li>
                                <li><a href="/about" className="nav_link">原石航路とは</a></li>
                                <li className="writer"><a href="/contests" className="nav_link">コンテスト応募</a></li>
                                <li className="login"><a href="/mypage" className="nav_link">マイページ</a></li>
                                <li className="sn_spacer" aria-hidden="true"></li>
                                <li className="login writer nav_post_menu"><a href="/post" className="oct_fill">作品を投稿する</a></li>
                                <li className="login sn_user">
                                    <a href="/mypage">
                                        <span className="sn_avatar" style={avatarStyle}></span>
                                        <span className="sn_name">{profile?.display_name ?? ''}</span>
                                    </a>
                                </li>
                                <li className="guest sn_auth">
                                    <a href="/auth/register" className="sn_signup oct_fill">新規登録</a>
                                    <a href="/auth/login" className="sn_login oct_line">ログイン</a>
                                </li>
                                <li className="nav_toggles">
                                    <button id="theme-toggle" className="oct_line sw_chip" role="switch" aria-checked={false} aria-label="ダークモード切替">
                                        <span className="icn icn_sun light"></span><span className="icn icn_moon dark"></span><span className="sw"></span>
                                    </button>
                                    <button id="writer-toggle" className="oct_line sw_chip" role="switch" aria-checked={false} aria-label="書き手 / 読み手切替">
                                        <span className="icn icn_book reader"></span><span className="icn icn_pen writer"></span><span className="sw"></span>
                                    </button>
                                    <a href="/mypage/messages" className="login oct_line icn_chip" aria-label="通知"><span className="icn icn_bell"></span></a>
                                    <a href="/mypage" className="oct_line icn_chip" aria-label="設定"><span className="icn icn_gear"></span></a>
                                </li>
                            </ul>
                        </div>
                    </li>
                </ul>
            </nav>
        </header>
        </div>
        <div className="header_spacer" aria-hidden="true"></div>
        </>
    )
}
