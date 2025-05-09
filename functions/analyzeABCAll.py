import pandas as pd
from collections import OrderedDict
import re

# Статические словари для преобразования меток
MONTH_NAMES = {
    "01": "Январь",   "02": "Февраль", "03": "Март",     "04": "Апрель",
    "05": "Май",      "06": "Июнь",    "07": "Июль",     "08": "Август",
    "09": "Сентябрь", "10": "Октябрь", "11": "Ноябрь",   "12": "Декабрь"
}

PERIOD_LABELS_RU = {
    "Q1":    "1 четверть",
    "Q2":    "2 четверть",
    "Q3":    "3 четверть",
    "Q4":    "4 четверть",
    "Year":  "Год",
    "Final": "Итог",
    "H1":    "1 полугодие",
    "H2":    "2 полугодие"
}

def analyzeABCAll(data, thresholdA=0.7, thresholdB=0.2, analysisType='grades'):
    """
    Выполняет ABC-анализ для каждого периода из data и возвращает OrderedDict,
    где ключи — периоды в нужном порядке: академический год (Сентябрь→Август),
    затем 1–4 четверть, 1–2 полугодие, Год, Итог, и всё остальное.
    """
    # 1) Разворачиваем во «всплывающую» табличку
    records = []
    for rec in data:
        for lbl, val in zip(rec['labels'], rec['values']):
            if (len(lbl) == 7 and lbl[4] == '-' and
                lbl[:4].isdigit() and lbl[5:].isdigit()):
                year, mon = lbl.split('-')
                period = f"{MONTH_NAMES.get(mon, mon)} {year}"
            else:
                period = PERIOD_LABELS_RU.get(lbl, lbl)
            records.append({
                'student_id': rec['student_id'],
                'Ученики':    rec['student_fio'],
                'Период':     period,
                'Баллы':      float(val)
            })

    df = pd.DataFrame(records)
    results = {}

    # 2–7) ABC-анализ по каждому периоду
    for period, grp in df.groupby('Период'):
        dfp = grp.copy()
        total = dfp['Баллы'].sum()
        if total == 0:
            results[period] = []
            continue

        dfp['Процент'] = dfp['Баллы'] / total
        asc = (analysisType == 'attendance')
        dfp = dfp.sort_values('Процент', ascending=asc).reset_index(drop=True)
        dfp['Кум.%'] = dfp['Процент'].cumsum()

        def cat(x):
            if x <= thresholdA:
                return 'A'
            elif x <= thresholdA + thresholdB:
                return 'B'
            else:
                return 'C'
        dfp['Категория'] = dfp['Кум.%'].apply(cat)

        summary = (
            dfp
            .groupby('Категория', as_index=False)['Баллы']
            .min()
            .rename(columns={'Баллы': 'Порог'})
        )
        dfp = dfp.merge(summary, on='Категория', how='left')

        results[period] = dfp[[
            'student_id', 'Ученики', 'Баллы',
            'Категория', 'Порог'
        ]].to_dict('records')

    # === Пост-обработка сортировки ключей periods ===

    # 1) Порядок месяцев в академическом году
    MONTH_ORDER = [
        "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
        "Январь", "Февраль", "Март", "Апрель",
        "Май", "Июнь", "Июль", "Август"
    ]

    # 2) Отфильтровываем месячные периоды вида "Месяц ГГГГ"
    month_periods = [
        p for p in results
        if re.match(rf"^({'|'.join(MONTH_ORDER)}) \d{{4}}$", p)
    ]

    # 3) Группируем их по академическим годам
    month_to_num = {v: int(k) for k, v in MONTH_NAMES.items()}
    acad_groups = {}
    for p in month_periods:
        name, year = p.split()
        y = int(year)
        m = month_to_num[name]
        acad_year = y if m >= 9 else y - 1
        acad_groups.setdefault(acad_year, []).append(p)

    # 4) Составляем упорядоченный список в рамках каждого академического года
    ordered = []
    for ay in sorted(acad_groups):
        for m in MONTH_ORDER:
            for p in acad_groups[ay]:
                if p.startswith(m):
                    ordered.append(p)

    # 5) Добавляем четверти
    for q in ("1 четверть", "2 четверть", "3 четверть", "4 четверть"):
        if q in results:
            ordered.append(q)
    # 6) Добавляем полугодия
    for h in ("1 полугодие", "2 полугодие"):
        if h in results:
            ordered.append(h)
    # 7) Добавляем Год и Итог
    for other in ("Год", "Итог"):
        if other in results:
            ordered.append(other)
    # 8) Остальные периоды (на всякий случай)
    for p in results:
        if p not in ordered:
            ordered.append(p)

    # 9) Собираем и возвращаем в виде OrderedDict
    sorted_results = OrderedDict((p, results[p]) for p in ordered)
    return sorted_results
