interface NavigationItem {
  name: string;
  href: string;
};

import Logo from '../../client/static/golive-logo.webp';

export default function Footer({ footerNavigation }: {
  footerNavigation: {
    app: NavigationItem[]
    company: NavigationItem[]
  }
}) {
  return (
    <div className='mx-auto mt-6 max-w-7xl px-6 lg:px-8 dark:bg-boxdark-2'>
      <footer
        aria-labelledby='footer-heading'
        className='relative border-t border-gray-900/10 dark:border-gray-200/10 py-24 sm:mt-32'
      >
        <h2 id='footer-heading' className='sr-only'>
          Footer
        </h2>
        {/* Sağ üst logo */}
        <a href='https://golive.com.tr/' aria-label='Kurumsal'
          className='absolute right-0 top-6 inline-flex items-center gap-2'>
          <img src={Logo} alt='Logo' className='h-14 w-auto opacity-90 hover:opacity-100 transition' />
        </a>

        <div className='flex items-start justify-end mt-6 gap-25'>
          <div>
            <h3 className='text-md font-bold leading-6 text-gray-900 dark:text-white'>Modüller</h3>
            <ul role='list' className='mt-6 space-y-4'>
              {footerNavigation.app.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className='text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-white'>
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className='text-md font-bold leading-6 text-gray-900 dark:text-white'>Kurumsal</h3>
            <ul role='list' className='mt-6 space-y-4'>
              {footerNavigation.company.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className='text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-white'>
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
