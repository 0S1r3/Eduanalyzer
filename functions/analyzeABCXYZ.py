import math
import pandas as pd
import logging

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)

def calculate_stddev(values):
    mean_value = sum(values) / len(values)
    variance = sum((x - mean_value) ** 2 for x in values) / len(values)
    return math.sqrt(variance)

def analyze_ABC_XYZ(data, thresholdA, thresholdB, thresholdX, thresholdY, analysisMeasure, start_col, end_col):
    df = pd.DataFrame(data['data1'], columns=data['columns1'])

    # Оставляем только нужные столбцы
    df = df[['№', 'Ученики', analysisMeasure]]

    # Пример выполнения ABC-анализа на основе средней оценки
    df[analysisMeasure] = df[analysisMeasure].astype(float)
    total_score = df[analysisMeasure].sum()
    df['Процент'] = df[analysisMeasure] / total_score
    
    df = df.sort_values('Процент', ascending=False) 
    df = df.reset_index(drop=True)
    df['Кумулятивный процент'] = df['Процент'].cumsum()

    def categorize(row):
        if row['Кумулятивный процент'] <= thresholdA:
            return 'A'
        elif row['Кумулятивный процент'] <= (thresholdA + thresholdB):
            return 'B'
        else:
            return 'C'

    df['Категория_ABC'] = df.apply(categorize, axis=1)

    df = df.sort_values('Кумулятивный процент', ascending=False)

    df['Кумулятивный процент'] = (df['Кумулятивный процент'] * 100).map('{:.2f}%'.format)
    df['Процент'] = (df['Процент'] * 100).map('{:.2f}%'.format)
        
    #####################XYZ-анализ#################################

    table_data = data['data2']
    columns = data['columns2']

    # Найти индексы указанных столбцов
    start_idx = columns.index(start_col)
    end_idx = columns.index(end_col) + 1

    # Вычислить сумму указанного диапазона столбцов для каждого ученика
    measure_data = []
    for row in table_data:
        student = row[1]
        values = [float(row[i]) for i in range(start_idx, end_idx) if row[i] != '']
        if values:  # Убедиться, что список не пуст
            mean_value = sum(values) / len(values)
            stddev_value = calculate_stddev(values)
            ratio_variation = stddev_value / mean_value * 100 if mean_value != 0 else 0
            analysis_measure = sum(values)
        else:
            mean_value = 0
            stddev_value = 0
            ratio_variation = 0
        measure_data.append((student, analysis_measure, ratio_variation))

    # Отсортировать данные на основе коэффициента вариации
    measure_data.sort(key=lambda x: x[2], reverse=True)

    result = []

    for i, (student, value, ratio_variation) in enumerate(measure_data):

        if ratio_variation <= thresholdX:
            category = 'X'
        elif ratio_variation <= (thresholdX + thresholdY):
            category = 'Y'
        else:
            category = 'Z'

        ration_var = '{:.2f}%'.format(ratio_variation)

        result.append({
            '№': i + 1,
            'Ученики': student,
            'Анализируемый период': value,
            'Коэффициент вариации': ration_var,
            'Категория_XYZ': category
        })

    df_result = pd.DataFrame(result)

    # Объединение результатов ABC и XYZ анализов, взяв только определенные столбцы из df_result
    merged_df = pd.merge(df, df_result[['Ученики', 'Анализируемый период', 'Коэффициент вариации', 'Категория_XYZ']], on='Ученики')

    # Конкатенация категорий
    merged_df['Категория'] = merged_df['Категория_ABC'] + merged_df['Категория_XYZ']

    result = merged_df[['№', 'Ученики', analysisMeasure, 'Анализируемый период','Процент', 'Кумулятивный процент', 'Коэффициент вариации', 'Категория']].to_dict(orient='records')
    return result