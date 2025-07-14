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

/**
 * The props for the ResultsDetails component.
 */
interface ResultsDetailsProps {
  /**
   * The case data object, inferred from the database schema.
   */
  caseData: typeof cases.$inferSelect;
}

/**
 * A component that displays key details of a case in a responsive grid of cards.
 *
 * @param {ResultsDetailsProps} props The component props.
 * @returns {JSX.Element} The rendered details grid.
 */
export const ResultsDetails = ({ caseData }: ResultsDetailsProps) => {
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
      bg: "bg-teal-600 hover:bg-teal-500",
      text: "text-teal-50",
      icon: "text-teal-300",
    },
    {
      bg: "bg-emerald-600 hover:bg-emerald-500",
      text: "text-emerald-50",
      icon: "text-emerald-300",
    },
    {
      bg: "bg-indigo-600 hover:bg-indigo-500",
      text: "text-indigo-50",
      icon: "text-indigo-300",
    },
    {
      bg: "bg-sky-600 hover:bg-sky-500",
      text: "text-sky-50",
      icon: "text-sky-300",
    },
    {
      bg: "bg-rose-600 hover:bg-rose-500",
      text: "text-rose-50",
      icon: "text-rose-300",
    },
    {
      bg: "bg-pink-600 hover:bg-pink-500",
      text: "text-pink-50",
      icon: "text-pink-300",
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
            className={`relative flex h-40 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-none p-4 shadow-none transition-all duration-300 outline-none ${theme.bg}`}
          >
            {/* A large, decorative background icon for visual flair. */}
            <Icon className={`absolute -right-4 -bottom-4 h-20 w-20 opacity-20 ${theme.icon}`} />

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
