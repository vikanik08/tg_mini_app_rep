const healthFeatureLabels = new Map<string, string>([
  ["urinary-urolithiasis", "МКБ (Мочекаменная болезнь)"],
  ["urinary-cystitis", "Цистит"],
  ["urinary-ckd", "ХПН (Хроническая почечная недостаточность)"],
  ["digestive-pancreatitis", "Панкреатит"],
  ["digestive-gastritis-colitis", "Хронический гастрит / колит"],
  ["digestive-sensitive", "Чувствительное пищеварение"],
  ["digestive-constipation", "Запоры / Мегаколон"],
  ["cardio-hcm", "ГКМП"],
  ["cardio-hypertension", "Артериальная гипертензия"],
  ["respiratory-asthma", "Астма"],
  ["respiratory-rhinitis", "Хронический ринит"],
  ["endocrine-diabetes", "Сахарный диабет"],
  ["endocrine-hyperthyroidism", "Гипертиреоз"],
  ["dental-stomatitis", "Стоматит"],
  ["dental-tartar", "Зубной камень"],
  ["dental-resorption", "Резорбция зубов"],
  ["mobility-arthritis", "Артрит / Остеоартроз"],
  ["mobility-dysplasia", "Дисплазия тазобедренного сустава"],
  ["senses-eye", "Хронический конъюнктивит / Кератит"],
  ["senses-deafness", "Глухота"],
  ["senses-blindness", "Слепота"],
  ["neuro-vestibular", "Синдром вестибулярного аппарата"],
  ["neuro-epilepsy", "Эпилепсия"],
  ["allergy-dermatitis", "Атопический дерматит"],
  ["allergy-food", "Пищевая аллергия"],
  ["allergy-fleas", "Аллергия на укусы блох"],
  ["virus-fiv", "Вирусный иммунодефицит кошек"],
  ["virus-felv", "Вирусная лейкемия кошек"],
  ["virus-herpes", "Герпесвирусная инфекция"],
  ["virus-calicivirus", "Калицивироз"],
]);

export function parseHealthFeatureNotes(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatHealthFeatureLabel(value: string) {
  return healthFeatureLabels.get(value) ?? value;
}

export function formatHealthFeatureNotes(value: string | null | undefined) {
  const items = parseHealthFeatureNotes(value).map(formatHealthFeatureLabel);
  return items.length > 0 ? items : [];
}
