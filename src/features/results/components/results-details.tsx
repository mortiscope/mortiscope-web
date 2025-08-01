import {
  FaBuilding,
  FaCalendarAlt,
  FaCity,
  FaHouseUser,
  FaMapMarkedAlt,
  FaThermometerThreeQuarters,
} from "react-icons/fa";

import { Card, CardTitle } from "@/components/ui/card";
import type { cases } from "@/db/schema";
import { ResultsDetailsSkeleton } from "@/features/results/components/results-skeleton";

/**
 * The props for the ResultsDetails component.
 */
interface ResultsDetailsProps {
  /**
   * The case data object, inferred from the database schema.
   */
  caseData?: typeof cases.$inferSelect;
  /**
   * If true, the component will render its skeleton state.
   */
  isLoading?: boolean;
}

/**
 * A component that displays key details of a case in a responsive grid of cards.
 *
 * @param {ResultsDetailsProps} props The component props.
 * @returns {JSX.Element} The rendered details grid.
 */
export const ResultsDetails = ({ caseData, isLoading }: ResultsDetailsProps) => {
  // If loading or data is not yet available, show the skeleton.
  if (isLoading || !caseData) {
    return <ResultsDetailsSkeleton />;
  }

  // Array of detail items to be mapped into cards.
  const details = [
    {
      title: "Case Date",
      value: caseData.caseDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      icon: FaCalendarAlt,
    },
    {
      title: "Temperature",
      value: `${caseData.temperatureCelsius}°C`,
      icon: FaThermometerThreeQuarters,
    },
    {
      title: "Region",
      value: caseData.locationRegion,
      icon: FaMapMarkedAlt,
    },
    {
      title: "Province",
      value: caseData.locationProvince,
      icon: FaBuilding,
    },
    {
      title: "City/Municipality",
      value: caseData.locationCity,
      icon: FaCity,
    },
    {
      title: "Barangay",
      value: caseData.locationBarangay,
      icon: FaHouseUser,
    },
  ];

  const colorThemes = [
    {
      bg: "bg-gradient-to-br from-teal-500 to-teal-700 transition duration-300 ease-in-out hover:from-teal-400 hover:to-teal-600",
      text: "text-teal-50",
      icon: "text-teal-200",
    },
    {
      bg: "bg-gradient-to-br from-emerald-500 to-emerald-700 transition duration-300 ease-in-out hover:from-emerald-400 hover:to-emerald-600",
      text: "text-emerald-50",
      icon: "text-emerald-200",
    },
    {
      bg: "bg-gradient-to-br from-indigo-500 to-indigo-700 transition duration-300 ease-in-out hover:from-indigo-400 hover:to-indigo-600",
      text: "text-indigo-50",
      icon: "text-indigo-200",
    },
    {
      bg: "bg-gradient-to-br from-sky-500 to-sky-700 transition duration-300 ease-in-out hover:from-sky-400 hover:to-sky-600",
      text: "text-sky-50",
      icon: "text-sky-200",
    },
    {
      bg: "bg-gradient-to-br from-rose-500 to-rose-700 transition duration-300 ease-in-out hover:from-rose-400 hover:to-rose-600",
      text: "text-rose-50",
      icon: "text-rose-200",
    },
    {
      bg: "bg-gradient-to-br from-pink-500 to-pink-700 transition duration-300 ease-in-out hover:from-pink-400 hover:to-pink-600",
      text: "text-pink-50",
      icon: "text-pink-200",
    },
  ];

  return (
    // The main grid container.
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {details.map((detail, index) => {
        // Selects a color theme from the array.
        const theme = colorThemes[index % colorThemes.length];
        // Retrieves the specific icon component for the current detail item.
        const Icon = detail.icon;

        return (
          // Renders a single detail card.
          <Card
            key={detail.title}
            className={`group relative flex h-40 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-none p-4 shadow-lg shadow-gray-900/10 transition-all duration-500 ease-in-out outline-none ${theme.bg}`}
          >
            {/* A large, decorative background icon for visual flair. */}
            <Icon
              className={`absolute -right-4 -bottom-4 h-20 w-20 opacity-20 transition-transform duration-500 ease-in-out group-hover:scale-110 ${theme.icon}`}
            />

            {/* The card's header section. */}
            <div className="relative flex items-center gap-2">
              <Icon className={`h-5 w-5 flex-shrink-0 ${theme.icon}`} />
              <CardTitle className={`font-inter text-sm font-normal ${theme.text}`}>
                {detail.title}
              </CardTitle>
            </div>

            {/* The main content area. */}
            <div
              className={`font-plus-jakarta-sans relative line-clamp-3 text-lg font-semibold md:text-xl ${theme.text}`}
            >
              {detail.value}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
