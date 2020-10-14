import React from 'react';
import { Grid } from '@material-ui/core';
import { maxGradedAttemptsPerRandomizationField, maxReRandomizationsField, randomizationDelayField, generateSwitchField, durationField } from './GenericFormInputs';

interface ExamSettingsProps {
    // This is the register function from react-hook-forms.
    register: any;
    control: any;
    watch: any;
}

export const ExamSettings: React.FC<ExamSettingsProps> = ({register, control}) => {
    return (
        <Grid container item md={12} spacing={3}>
            <Grid item container md={12}><h2>Exam Settings</h2></Grid>
            <Grid container item md={12} spacing={1}>
                <Grid md={12} item><h4>Time Settings</h4></Grid>
                <Grid md={12} item>
                    <p>
                        Duration controls how long the test will run for. 
                        Hard Cutoff forces submissions to occur at the end date of the exam. 
                        Unsetting it will allow students to have the full duration to submit their exam.
                    </p>
                </Grid>
                <Grid md={4} item>{durationField(register)}</Grid>
                <Grid md={4} item>{generateSwitchField(control, 'hardCutoff')}</Grid>
            </Grid>
            <Grid item container md={12} spacing={1}>
                <Grid md={12} item><h4>Re-Randomization Settings</h4></Grid>
                <Grid md={12} item>
                    <p>
                        Re-Randomization allows for students to generate new versions of the exams by shuffling problem order and random seeds.
                    </p>
                </Grid>
                <Grid md={4} item>{maxGradedAttemptsPerRandomizationField(register)}</Grid>
                <Grid md={4} item>{maxReRandomizationsField(register)}</Grid>
                <Grid md={4} item>{randomizationDelayField(register)}</Grid>
                <Grid md={4} item>{generateSwitchField(control, 'randomizeOrder')}</Grid>
            </Grid>
            <Grid item container md={12} spacing={1}>
                <Grid md={12} item><h4>Post-Submission Settings</h4></Grid>
                <Grid md={12} item>
                    <p>
                        These setttings control how students can interact with the exam after they&apos;ve submitted their attempt.
                    </p>
                </Grid>
                <Grid md={3} item>{generateSwitchField(control, 'hideHints')}</Grid>
                <Grid md={3} item>{generateSwitchField(control, 'showItemizedResults')}</Grid>
                <Grid md={3} item>{generateSwitchField(control, 'showTotalGradeImmediately')}</Grid>
                <Grid md={3} item>{generateSwitchField(control, 'hideProblemsAfterFinish')}</Grid>
            </Grid>
        </Grid>
    );
};

export default ExamSettings;