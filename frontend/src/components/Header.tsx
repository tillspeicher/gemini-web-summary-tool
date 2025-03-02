import LOGO from "~/resources/logo.png"

export default function Header() {
    return (
        <header class="sticky top-0 h-16 w-full bg-white border-b border-gray-200 flex items-center px-4">
            <img src={LOGO} alt="Logo" class="w-10 h-10" />
        </header>
    )
}
