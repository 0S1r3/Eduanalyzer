import pandas as pd

# ABC-анализ
def analyzeABC_data(data, thresholdA, thresholdB, analysisMeasure, analysisType):
    df = pd.DataFrame(data['data'], columns=data['columns'])

    # Оставляем только нужные столбцы
    df = df[['№', 'Ученики', analysisMeasure]]

    # Пример выполнения ABC-анализа на основе средней оценки
    df[analysisMeasure] = df[analysisMeasure].astype(float)
    total_score = df[analysisMeasure].sum()
    df['Процент'] = df[analysisMeasure] / total_score
    
    if(analysisType == 'attendance'):
        df = df.sort_values('Процент', ascending=True)   
    else:
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

    df['Категория'] = df.apply(categorize, axis=1)

    df = df.sort_values('Кумулятивный процент', ascending=False)

    df['Кумулятивный процент'] = (df['Кумулятивный процент'] * 100).map('{:.2f}%'.format)
    df['Процент'] = (df['Процент'] * 100).map('{:.2f}%'.format)
        
    result = df[['№', 'Ученики', analysisMeasure,'Процент', 'Кумулятивный процент', 'Категория']].to_dict(orient='records')
    return result
