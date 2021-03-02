import React, { useEffect, useState } from 'react';
import { getAttachments } from '../../APIInterfaces/BackendAPI/Requests/CourseRequests';
import logger from '../../Utilities/Logger';
import { ProblemAttachments } from '../CourseInterfaces';
import url from 'url';
import { Grid, CardActionArea, CardMedia, CardContent, CardActions, Button, Card } from '@material-ui/core';
import PrintingPage from './PrintingPage';
import Heic from '../../Components/Heic';
import _ from 'lodash';


interface AttachmentsPreviewProps {
    gradeId?: number;
    gradeInstanceId?: number;
    workbookId?: number;

}

export const AttachmentsPreview: React.FC<AttachmentsPreviewProps> = ({gradeId, gradeInstanceId, workbookId}) => {
    const [attachedFiles, setAttachedFiles] = useState<Array<ProblemAttachments>>([]);
    const [baseUrl, setBaseUrl] = useState<string>(window.location.host);
    const [shouldPrint, setShouldPrint] = useState<boolean>(false);

    // Get list of attached files.
    useEffect(()=>{
        logger.debug('Attachments Preview: Loading attachments for workbook');
        (async () => {
            try {
                const res = await getAttachments({
                    studentWorkbookId: workbookId,
                    studentGradeId : gradeId,
                    studentGradeInstanceId: gradeInstanceId,
                });

                const alreadyAttachedFiles = res.data.data.attachments;
                const baseUrl = res.data.data.baseUrl;

                setBaseUrl(baseUrl);
                setAttachedFiles(alreadyAttachedFiles.map(file => new ProblemAttachments(file)));
            } catch (e) {
                logger.error('Failed to get attachments.', e);
            }
        })();
    }, [gradeId, gradeInstanceId, workbookId]);

    return (
        <Grid container style={{paddingLeft: '1rem'}}>
            <Grid item md={12}>
                {attachedFiles.length > 0 ? <h1>Attachments</h1> : <h3>The selected student has not uploaded any files for this problem.</h3>}
                {/* This is hidden because printing attachments for a specific version is not currently supported. */}
                {false && <><PrintingPage
                    debug={false}
                    open={shouldPrint}
                    attachmentsUrls={attachedFiles.map(attachment => (baseUrl && attachment.cloudFilename) ? url.resolve(baseUrl.toString(), attachment.cloudFilename) : '/404')}
                />
                <Button onClick={()=>setShouldPrint(true)}>Export All</Button></>}
            </Grid>
            {
                attachedFiles.map(attachment => (
                    <Grid item md={4} key={attachment.userLocalFilename} spacing={1}>
                        <Card style={{width: '300px'}}>
                            <CardActionArea>
                                <CardMedia style={{height: '140px'}}>
                                    {
                                        (_.endsWith(attachment.userLocalFilename?.toLowerCase(), '.heic') || _.endsWith(attachment.userLocalFilename?.toLowerCase(), '.heif')) ? 
                                            <Heic
                                                title={attachment.cloudFilename ?? 'No Filename'}
                                                url={(baseUrl && attachment.cloudFilename) ? url.resolve(baseUrl.toString(), attachment.cloudFilename) : '/404'}
                                                height={140}
                                                style={{objectFit: 'cover', width: '100%'}}
                                            /> :
                                            <embed
                                                title={attachment.cloudFilename}
                                                src={(baseUrl && attachment.cloudFilename) ? url.resolve(baseUrl.toString(), attachment.cloudFilename) : '/404'}
                                                height={140}
                                                style={{objectFit: 'cover', width: '100%'}}
                                            />
                                    }
                                </CardMedia>
                                <CardContent>
                                    <h5>{attachment.userLocalFilename}</h5>
                                    Uploaded on {attachment.updatedAt?.toMoment().formattedMonthDateTime()}
                                </CardContent>
                            </CardActionArea>
                            <CardActions>
                                <Button
                                    variant='text'
                                    size='small'
                                    color='primary'
                                    href={(baseUrl && attachment.cloudFilename) ? url.resolve(baseUrl.toString(), attachment.cloudFilename) : '/404'}
                                    target="_blank"
                                    rel='noopener noreferrer'
                                >
                                        Open in a new tab
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))
            }
        </Grid>
    );
};


export default AttachmentsPreview;