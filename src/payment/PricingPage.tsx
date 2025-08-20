import { useAuth } from 'wasp/client/auth';
import { generateCheckoutSession, getCustomerPortalUrl, useQuery } from 'wasp/client/operations';
import { PaymentPlanId, paymentPlans, prettyPaymentPlanName, SubscriptionStatus } from './plans';
import { AiFillCheckCircle, AiOutlineCopy, AiOutlineMail } from 'react-icons/ai';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../client/cn';

const bestDealPaymentPlanId: PaymentPlanId = PaymentPlanId.Pro;

interface PaymentPlanCard {
  name: string;
  price: string;
  description: string;
  features: string[];
}



export const paymentPlanCards: Record<PaymentPlanId, PaymentPlanCard> = {
  [PaymentPlanId.Pro]: {
    name: prettyPaymentPlanName(PaymentPlanId.Pro),
    price: '$19.99',
    description: '',
    features: ['Size uygun kullanıcı ve sorgu sayısı', 'Size uygun paket içeriği', 'İhtiyacınız olan entegrasyonlar'],
  },
};

const PricingPage = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contactOpenFor, setContactOpenFor] = useState<PaymentPlanId | null>(null);
  const [copiedFor, setCopiedFor] = useState<PaymentPlanId | null>(null);

  const { data: user } = useAuth();
  const isUserSubscribed =
    !!user && !!user.subscriptionStatus && user.subscriptionStatus !== SubscriptionStatus.Deleted;

  const {
    data: customerPortalUrl,
    isLoading: isCustomerPortalUrlLoading,
    error: customerPortalUrlError,
  } = useQuery(getCustomerPortalUrl, { enabled: isUserSubscribed });

  const navigate = useNavigate();

  const SALES_EMAIL = 'furkan.tufan@golive.com.tr';
  function buildMailto(planId: PaymentPlanId, userEmail?: string) {
    const subject = `[Pricing] ${prettyPaymentPlanName(planId)} hakkında`;
    const bodyLines = [
      'Merhaba,',
      '',
      `${prettyPaymentPlanName(planId)} paketi için ihtiyacımı kısaca özetliyorum`,
      '- ',
      '',
      'Teşekkürler.'
    ].filter(Boolean);
    const body = bodyLines.join('\n');

    return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleBuyNowClick(paymentPlanId: PaymentPlanId) {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setIsPaymentLoading(true);

      const checkoutResults = await generateCheckoutSession(paymentPlanId);

      if (checkoutResults?.sessionUrl) {
        window.open(checkoutResults.sessionUrl, '_self');
      } else {
        throw new Error('Error generating checkout session URL');
      }
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Error processing payment. Please try again later.');
      }
      setIsPaymentLoading(false); // We only set this to false here and not in the try block because we redirect to the checkout url within the same window
    }
  }

  const handleCustomerPortalClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (customerPortalUrlError) {
      setErrorMessage('Error fetching Customer Portal URL');
      return;
    }

    if (!customerPortalUrl) {
      setErrorMessage(`Customer Portal does not exist for user ${user.id}`);
      return;
    }

    window.open(customerPortalUrl, '_blank');
  };

  return (
    <div className='py-8 lg:mt-5'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        <div id='pricing' className='mx-auto max-w-4xl text-center'>
          <h2 className='mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white'>
            Aylık ödeme biçimi
          </h2>
        </div>
        {/*<p className='mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-white'>
          Ödeme Detayları Çok Yakında!
        </p>
        */}
        {errorMessage && (
          <div className='mt-8 p-4 bg-red-100 text-red-600 rounded-md dark:bg-red-200 dark:text-red-800'>
            {errorMessage}
          </div>
        )}
        <div className='isolate mx-auto mt-16 sm:mt-20 flex justify-center'>
          {(Object.keys(paymentPlanCards) as PaymentPlanId[]).map((planId) => (
            <div
              key={planId}
              className={cn(
                'relative flex flex-col justify-between rounded-3xl ring-gray-900/10 dark:ring-gray-100/10 overflow-hidden p-8 xl:p-10 w-full lg:w-1/2 mx-auto',
                {
                  'ring-2': planId === bestDealPaymentPlanId,
                  'ring-1': planId !== bestDealPaymentPlanId,
                }
              )}
            >

              {planId === bestDealPaymentPlanId && (
                <div
                  className='absolute top-0 right-0 -z-10 w-full h-full transform-gpu blur-3xl'
                  aria-hidden='true'
                >
                  <div
                    className='absolute w-full h-full bg-gradient-to-br from-amber-400 to-purple-300 opacity-30 dark:opacity-50'
                    style={{
                      clipPath: 'circle(670% at 50% 50%)',
                    }}
                  />
                </div>
              )}
              <div className='mb-8'>
                <div className='flex items-center justify-between gap-x-4'>
                  <h3 id={planId} className='text-gray-900 text-lg font-semibold leading-8 dark:text-white'>
                    {paymentPlanCards[planId].name}
                  </h3>
                </div>
                <p className='mt-4 text-sm leading-6 text-gray-600 dark:text-white'>
                  {paymentPlanCards[planId].description}
                </p>
                {/*
                <p className='mt-6 flex items-baseline gap-x-1 dark:text-white'>
                  <span className='text-4xl font-bold tracking-tight text-gray-900 dark:text-white'>
                    {paymentPlanCards[planId].price}
                  </span>
                  <span className='text-sm font-semibold leading-6 text-gray-600 dark:text-white'>
                    {paymentPlans[planId].effect.kind === 'subscription' && '/month'}
                  </span>
                </p>
                */}
                <ul role='list' className='mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-white'>
                  {paymentPlanCards[planId].features.map((feature) => (
                    <li key={feature} className='flex gap-x-3'>
                      <AiFillCheckCircle className='h-6 w-5 flex-none text-yellow-500' aria-hidden='true' />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              {isUserSubscribed ? (
                <button
                  onClick={handleCustomerPortalClick}
                  disabled={isCustomerPortalUrlLoading}
                  aria-describedby='manage-subscription'
                  className={cn(
                    'mt-8 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400',
                    {
                      'bg-yellow-500 text-white hover:text-white shadow-sm hover:bg-yellow-400':
                        planId === bestDealPaymentPlanId,
                      'text-gray-600 ring-1 ring-inset ring-purple-200 hover:ring-purple-400':
                        planId !== bestDealPaymentPlanId,
                    }
                  )}
                >
                  Aboneliğini Yönet
                </button>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <>
                    {contactOpenFor === planId ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={buildMailto(planId, user?.email ?? undefined)}
                          className="inline-flex items-center gap-2 rounded-md py-2 px-3 text-sm font-semibold leading-6
             bg-indigo-600 text-white hover:bg-indigo-700
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          aria-label="E-posta gönder"
                          title="E-posta gönder"
                        >
                          <AiOutlineMail className="h-5 w-5" />
                          <span>Mail Gönder</span>
                        </a>

                        {/* Kopyala (yaygın copy butonu stili: nötr gri, hafif border+shadow) */}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(SALES_EMAIL)
                              .then(() => {
                                setCopiedFor(planId);
                                setTimeout(() => setCopiedFor(null), 1500);
                              })
                              .catch(() => { });
                          }}
                          className="inline-flex items-center gap-2 rounded-md py-2 px-3 text-sm font-medium
                 border border-slate-300 bg-slate-50 text-slate-700 shadow-sm
                 hover:bg-slate-100 active:bg-slate-200 h-10
                 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                          aria-label="E-posta adresini kopyala"
                          title="E-posta adresini kopyala"
                        >
                          <AiOutlineCopy className="h-5 w-5" />
                          <span>{copiedFor === planId ? 'Kopyalandı' : 'Mail Adresini Kopyala'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setContactOpenFor(planId)}
                        className={cn(
                          {
                            'bg-yellow-500 text-white hover:text-white shadow-sm hover:bg-yellow-400':
                              planId === bestDealPaymentPlanId,
                            'text-gray-600 ring-1 ring-inset ring-purple-200 hover:ring-purple-400':
                              planId !== bestDealPaymentPlanId,
                          },
                          'block rounded-md py-2 px-3 text-center text-sm dark:text-white font-semibold leading-6 ' +
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 h-10'
                        )}
                      >
                        Bize Ulaşın
                      </button>
                    )
                    }
                  </>

                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
