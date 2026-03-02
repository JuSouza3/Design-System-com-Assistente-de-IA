import { APP_LOGO } from '@/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/custom/base/select';
import { useTranslation } from 'react-i18next';
import UserDropdown from '@/components/custom/ui/UserDropdown';
import { useTheme } from '@/context/ThemeContext';
import { SidebarTrigger } from '@/components/custom/base/sidebar';


const Topbar = () => {
  const { t } = useTranslation();
  const {
    userBrands,
    userDealers,
    selectedDealer,
    setSelectedDealer,
    selectedBrand,
    logo,
  } = useTheme();

  const currentBrand = userBrands.find(brand => brand.idBrand === (selectedDealer?.idBrand ?? selectedBrand)) || userBrands[0];

  const handleDealerChange = (value: string) => {
    const id = Number(value);
    const dealer = userDealers.find((d) => d.idDealership === id) || null;
    setSelectedDealer(dealer);
  };

  const onlyOneDealer = userDealers.length === 1;
  return (
    <header className="relative my-4 radius-lg">
      <div className="flex w-full items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div className="flex flex-1 items-center justify-between gap-4 bg-white rounded-lg">
          {onlyOneDealer ? (
            <div className="w-full flex flex-col items-center justify-center py-2 ">
              <div className="flex items-center xl:absolute left-2">
                <img src={APP_LOGO} alt="Logo" className="h-7 w-auto mr-2 max-md:hidden" />
                <p className="font-bold max-md:hidden text-center">
                  {t('Concessionária')}
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <span className="text-lg font-bold uppercase w-full text-center block">
                  {selectedDealer?.name ?? t('Concessionária')}
                </span>
                {logo ? (
                  <img
                    src={logo}
                    alt={currentBrand?.name}
                    className="h-7 w-auto max-w-[100px] object-contain mx-auto"
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <Select value={String(selectedDealer?.idDealership ?? userDealers[0]?.idDealership ?? '')} onValueChange={handleDealerChange}>
              <SelectTrigger size="sm" className="h-[43px]! border-none shadow-none w-full justify-center">
                <SelectValue className="w-full">
                  <div className="flex items-center gap-2 max-md:hidden xl:absolute left-2">
                    <img src={APP_LOGO} alt="Logo" className="h-7 w-auto" />
                    <p className="font-bold">
                      {t('Concessionária')}
                    </p>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-lg font-bold uppercase">
                      {selectedDealer?.name ?? t('Concessionária')}
                    </span>
                    {logo ? (
                      <img
                        src={logo}
                        alt={currentBrand?.name}
                        className="h-7 w-auto max-w-[100px] object-contain"
                      />
                    ) : null}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {userDealers.map((dealer: any) => (
                  <SelectItem key={dealer.idDealership} value={String(dealer.idDealership)}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{dealer.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-4 md:flex">
          <div className="hidden md:block">
            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
