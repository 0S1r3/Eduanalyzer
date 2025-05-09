import math
import pandas as pd
from collections import OrderedDict
import re

# Статические словари
MONTH_NAMES = {
    "01": "Январь", "02": "Февраль", "03": "Март", "04": "Апрель",
    "05": "Май", "06": "Июнь", "07": "Июль", "08": "Август",
    "09": "Сентябрь", "10": "Октябрь", "11": "Ноябрь", "12": "Декабрь"
}
PERIOD_LABELS_RU = {
    "Q1": "1 четверть", "Q2": "2 четверть", "Q3": "3 четверть", "Q4": "4 четверть",
    "H1": "1 полугодие", "H2": "2 полугодие",
    "Year": "Год", "Final": "Итог"
}

def calculate_stddev(values):
    """Вычисление стандартного отклонения по списку значений."""
    if not values:
        return 0.0
    mean_val = sum(values) / len(values)
    var = sum((x - mean_val) ** 2 for x in values) / len(values)
    return math.sqrt(var)

def analyze_window(dfw, thresholdX, thresholdY):
    """
    Обработка одного окна (периода или диапазона):
    - считаем mean, stddev, cv
    - присваиваем категорию X/Y/Z
    - вычисляем порог (минимум баллов в каждой категории)
    """
    res = []
    for sid, sub in dfw.groupby('student_id'):
        name = sub['Ученики'].iat[0]
        scores = sub['Баллы'].tolist()
        mean_val = sum(scores) / len(scores) if scores else 0
        stddev = calculate_stddev(scores)
        cv = (stddev / mean_val * 100) if mean_val else 0
        cat = 'X' if cv <= thresholdX else 'Y' if cv <= thresholdX + thresholdY else 'Z'
        res.append({
            'student_id': sid,
            'Ученики': name,
            'Баллы': mean_val,
            'Коэффициент вариации': f"{cv:.2f}%",
            'Категория': cat
        })
    # добавляем колонку Порог
    df_res = pd.DataFrame(res)
    if not df_res.empty:
        thresholds = (
            df_res
            .groupby('Категория', as_index=False)['Баллы']
            .min()
            .rename(columns={'Баллы': 'Порог'})
        )
        df_res = df_res.merge(thresholds, on='Категория', how='left')
        return df_res[[
            'student_id', 'Ученики', 'Баллы',
            'Коэффициент вариации', 'Категория', 'Порог'
        ]].to_dict('records')
    return []

def analyzeXYZAll(data, thresholdX=10.0, thresholdY=25.0, thresholdZ=65.0):
    """
    XYZ-анализ по скользящим периодам:
    - месяцы (пары и полный диапазон)
    - кварталы (пары, полный диапазон, специальные сочетания)
    - полугодия (пары, специальные сочетания)
    Убираем одиночные месяцы, четверти, полугодия, Год и Итог.
    """
    # 1) Собираем «плоскую» таблицу
    records = []
    for rec in data:
        for lbl, val in zip(rec['labels'], rec['values']):
            if re.match(r"^\d{4}-\d{2}$", lbl):
                y, m = lbl.split('-')
                period = f"{MONTH_NAMES.get(m, m)} {y}"
            else:
                period = PERIOD_LABELS_RU.get(lbl, lbl)
            records.append({
                'student_id': rec['student_id'],
                'Ученики':    rec['student_fio'],
                'Период':     period,
                'Баллы':      float(val)
            })
    df = pd.DataFrame(records)
    if df.empty:
        return OrderedDict()

    results = {}

    # 2) Месяцы в хронологическом порядке
    months = sorted(
        {p for p in df['Период'].unique() if re.match(r"^[А-Я][а-я]+ \d{4}$", p)},
        key=lambda x: (int(x.split()[1]), list(MONTH_NAMES.values()).index(x.split()[0]))
    )

    # 3) Пары месяцев
    for i in range(len(months) - 1):
        lbl = f"{months[i]}–{months[i+1]}"
        dfw = df[df['Период'].isin([months[i], months[i+1]])]
        results[lbl] = analyze_window(dfw, thresholdX, thresholdY)

    # 4) Полный диапазон месяцев
    if months:
        lbl = f"{months[0]}–{months[-1]}"
        dfw = df[df['Период'].isin(months)]
        results[lbl] = analyze_window(dfw, thresholdX, thresholdY)

    # 5) Квартальные пары
    quarters = ["1 четверть", "2 четверть", "3 четверть", "4 четверть"]
    existing_q = set(df['Период'].unique())
    for i in range(len(quarters) - 1):
        a, b = quarters[i], quarters[i+1]
        if {a, b}.issubset(existing_q):
            lbl = f"{a}–{b}"
            dfw = df[df['Период'].isin([a, b])]
            results[lbl] = analyze_window(dfw, thresholdX, thresholdY)

    # 6) Полный диапазон кварталов (1–4)
    if set(quarters).issubset(existing_q):
        lbl = f"{quarters[0]}–{quarters[-1]}"
        dfw = df[df['Период'].isin(quarters)]
        results[lbl] = analyze_window(dfw, thresholdX, thresholdY)

    # 7) Специальные сочетания квартал→Год/Итог
    for q in ("4 четверть", "1 четверть"):
        for p in ("Год", "Итог"):
            if {q, p}.issubset(existing_q):
                lbl = f"{q}–{p}"
                dfw = df[df['Период'].isin([q, p])]
                results[lbl] = analyze_window(dfw, thresholdX, thresholdY)

    # 8) Полугодия
    halves = ["1 полугодие", "2 полугодие"]
    if set(halves).issubset(existing_q):
        lbl = f"{halves[0]}–{halves[1]}"
        dfw = df[df['Период'].isin(halves)]
        results[lbl] = analyze_window(dfw, thresholdX, thresholdY)
    for h in halves:
        for p in ("Год", "Итог"):
            if {h, p}.issubset(existing_q):
                lbl = f"{h}–{p}"
                dfw = df[df['Период'].isin([h, p])]
                results[lbl] = analyze_window(dfw, thresholdX, thresholdY)

    # 9) Фильтрация: убираем одиночные месяцы, четверти, полугодия, "Год", "Итог"
    single_periods = set(quarters + halves + ["Год", "Итог"])
    month_pattern = re.compile(r"^[А-Я][а-я]+ \d{4}$")
    filtered = {
        k: v for k, v in results.items()
        if k not in single_periods and not month_pattern.match(k)
    }

    # 10) Собираем в порядке вставки
    ordered = [k for k in results.keys() if k in filtered]
    return OrderedDict((k, filtered[k]) for k in ordered)
