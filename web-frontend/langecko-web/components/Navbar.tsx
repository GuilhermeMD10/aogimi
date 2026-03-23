import Link from 'next/link';

export default function Navbar() {
  return (
    <div className="top-0 left-0 bg-lumina-sidebar-background text-black min-w-[18%] h-screen rounded-2xl ">
      <ul className="flex flex-col gap-20 items-center justify-center h-full">
        <li className="p-2 bg-amber-300 rounded-2xl">
          <Link href="/">Logo</Link>
        </li>
        <li className="p-2 bg-amber-300 rounded-2xl">
          <Link href="/epub-pdf-reader">Epub pdf Reader</Link>
        </li>
        <li className="p-2 bg-amber-300 rounded-2xl">
          <Link href="/dictionary">Dictionary</Link>
        </li>
        <li className="p-2 bg-amber-300 rounded-2xl">Profile</li>
        <li className="p-2 bg-amber-300 rounded-2xl">Settings</li>
      </ul>
    </div>
  );
}
