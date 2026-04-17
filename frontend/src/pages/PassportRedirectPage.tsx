import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../widgets/layout/AppLayout";
import { getPets } from "../entities/pet/api";
import { buildPassportPath, pickActivePet, syncActivePet } from "../shared/lib/activePet";
import "./passport-page-live.css";

export default function PassportRedirectPage() {
  const petsQuery = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  const pet = useMemo(() => pickActivePet(petsQuery.data ?? []), [petsQuery.data]);

  if (petsQuery.isLoading) {
    return (
      <AppLayout>
        <div className="P-PassportLive">
          <section className="P-PassportLive__stateCard">
            <h1 className="P-PassportLive__title">Паспорт питомца</h1>
            <p className="P-PassportLive__stateText">Загружаю питомца...</p>
          </section>
        </div>
      </AppLayout>
    );
  }

  if (pet) {
    syncActivePet(pet);
    return <Navigate to={buildPassportPath(pet.id)} replace />;
  }

  return <Navigate to="/passport/edit" replace />;
}
