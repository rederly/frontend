import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import PDFOnePage from './PDFOnePage';
import { usePrintLoadingContext, PrintLoadingActions } from '../../Contexts/PrintLoadingContext';
import pdfjs, { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/webpack';
import {PDFDocumentProxy } from 'pdfjs-dist/types/display/api';
// GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface PDFInlineRenderProps {
    url: string;
}

export const PDFInlineRender: React.FC<PDFInlineRenderProps> = ({url}) => {
    const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
    const {dispatch} = usePrintLoadingContext();

    useEffect(() => {
        const loadPDF = (async () => {
            // TODO: We can hook into onProgress here.
            const doc = await getDocument({url}).promise;
            setPdf(doc);
        })();

        dispatch?.({
            type: PrintLoadingActions.ADD_PROMISE,
            payload: loadPDF,
        });
    }, [url]);

    return (
        <div>
            {
                pdf && _.range(pdf.numPages).map(index => (
                    <PDFOnePage pagePromise={pdf.getPage(index+1)} key={url + index}/>
                ))
            }
        </div>
    );
};

export default PDFInlineRender;
