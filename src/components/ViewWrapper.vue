<template>
  <div>
    <v-container class="view-container my-8 py-0">
      <v-row>
        <v-col cols="9" class="left-side">
          <slot></slot>
        </v-col>

        <v-col cols="3" class="right-side">
          <affix v-if="showFeeSummary"
                 relative-element-selector=".left-side"
                 :offset="{ top: 86, bottom: 12 }"
          >
            <!-- Corrections still use the basic Fee Summary component -->
            <aside v-if="isCorrectionFiling && correctionHasFilingData">
              <SbcFeeSummary
                :filingData="[...getFilingData]"
                :payURL="payApiUrl"
              />
            </aside>

            <!-- Alteration/Change/Conversion/Restoration filings use the enhanced Fee Summary shared component -->
            <v-expand-transition>
              <FeeSummaryShared
                v-if="showFeeSummaryShared"
                :filingData="getFilingData"
                :payApiUrl="payApiUrl"
                :isLoading="isBusySaving"
                :hasConflicts="isConflictingLegalType && getNameRequestNumber"
                :confirmLabel="feeSummaryConfirmLabel"
                :errorMessage="feeSummaryError"
                :isSummaryMode="isSummaryMode"
                @action="handleFeeSummaryActions($event)"
              />
            </v-expand-transition>
          </affix>
        </v-col>
        <!-- end of v-col -->
      </v-row>
    </v-container>
    <!-- Actions component is for Corrections only -->
    <Actions
      v-if="isCorrectionFiling"
      :key="$route.path"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { Affix as affix } from 'vue-affix'
import { Component } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { Navigate } from '@/utils/'
import PaySystemAlert from 'sbc-common-components/src/components/PaySystemAlert.vue'
import SbcFeeSummary from 'sbc-common-components/src/components/SbcFeeSummary.vue'
import { FeeSummary as FeeSummaryShared } from '@bcrs-shared-components/fee-summary/'
import { Actions, EntityInfo } from '@/components/common/'
import { ConfirmDialog as ConfirmDialogShared } from '@bcrs-shared-components/confirm-dialog/'
import { AuthServices, LegalServices } from '@/services/'
import { CommonMixin, FilingTemplateMixin } from '@/mixins/'
import { FilingDataIF, ActionBindingIF, ConfirmDialogType, FlagsReviewCertifyIF, FlagsCompanyInfoIF,
  AlterationFilingIF, ChgRegistrationFilingIF, ConversionFilingIF, RestorationFilingIF, SpecialResolutionFilingIF }
  from '@/interfaces/'
import { SessionStorageKeys } from 'sbc-common-components/src/util/constants'
import { ComponentsCompanyInfo, ComponentsReviewCertify, RouteNames } from '@/enums/'
import { FeeSummaryActions } from '@bcrs-shared-components/enums/'

@Component({
  components: {
    Actions,
    affix,
    ConfirmDialogShared,
    EntityInfo,
    FeeSummaryShared,
    PaySystemAlert,
    SbcFeeSummary
  },
  mixins: [
    CommonMixin,
    FilingTemplateMixin
  ]
})
export default class App extends Vue {
  // Refs
  $refs!: {
    confirm: ConfirmDialogType
  }

  // Global getters
  @Getter getUserEmail!: string
  @Getter getUserPhone!: string
  @Getter getUserFirstName!: string
  @Getter getUserLastName!: string
  @Getter getUserRoles!: string
  @Getter getUserUsername!: string
  @Getter getOrgInfo!: any
  @Getter getFilingData!: FilingDataIF[]
  @Getter haveUnsavedChanges!: boolean
  @Getter isBusySaving!: boolean
  @Getter isCorrectionEditing!: boolean
  @Getter isSummaryMode!: boolean
  @Getter showFeeSummary!: boolean
  @Getter getCurrentJsDate!: Date
  @Getter getFilingId!: number
  @Getter isRestorationFiling!: boolean

  // Alteration flag getters
  @Getter getFlagsReviewCertify!: FlagsReviewCertifyIF
  @Getter getFlagsCompanyInfo!: FlagsCompanyInfoIF
  @Getter getAppValidate!: boolean
  @Getter getComponentValidate!: boolean
  @Getter isConflictingLegalType!: boolean
  @Getter isRoleStaff!: boolean
  @Getter isSbcStaff!: boolean

  // Global actions
  @Action setHaveUnsavedChanges!: ActionBindingIF
  @Action setSummaryMode!: ActionBindingIF
  @Action setComponentValidate!: ActionBindingIF
  @Action setAppValidate!: ActionBindingIF
  @Action setIsSaving!: ActionBindingIF
  @Action setIsFilingPaying!: ActionBindingIF

  // Local properties
  protected accountAuthorizationDialog = false
  protected fetchErrorDialog = false
  protected paymentErrorDialog = false
  protected staffPaymentErrorDialog = false
  protected saveErrorDialog = false
  protected nameRequestErrorDialog = false
  protected nameRequestErrorType = ''
  protected saveErrors: Array<object> = []
  protected saveWarnings: Array<object> = []
  protected fileAndPayInvalidNameRequestDialog = false
  protected confirmDeleteAllDialog = false

  // FUTURE: change appReady/haveData to a state machine?
  /** Whether the app is ready and the views can now load their data. */
  protected appReady = false

  /** Whether the views have loaded their data and the spinner can be hidden. */
  protected haveData = false

  /** The Update Current JS Date timer id. */
  private updateCurrentJsDateId = 0

  /** The URL of the Pay API. */
  get payApiUrl (): string {
    return sessionStorage.getItem('PAY_API_URL')
  }

  /** Whether user is authenticated. */
  get isAuthenticated (): boolean {
    return Boolean(sessionStorage.getItem(SessionStorageKeys.KeyCloakToken))
  }

  /** The fee summary confirm button label. */
  get feeSummaryConfirmLabel (): string {
    const isNoFee = this.isFirmChangeFiling || this.isFirmConversionFiling
    if (this.isSummaryMode) {
      return (isNoFee && !this.getFilingData.some(fd => fd.priority)) ? 'File Now (No Fee)' : 'File and Pay'
    } else {
      return isNoFee ? 'Review and Confirm' : 'Review and Certify'
    }
  }

  /** Error text to display in the Fee Summary component. */
  get feeSummaryError (): string {
    if (this.isSummaryMode) {
      return this.hasInvalidReviewSections ? '&lt; Please complete required information' : ''
    } else {
      return this.hasInvalidSections ? '&lt; You have unfinished changes' : ''
    }
  }

  /** True is there are any invalid component sections. */
  get hasInvalidSections (): boolean {
    return (
      this.getComponentValidate &&
      Object.values(this.getFlagsCompanyInfo).some(val => val === false)
    )
  }

  /** True if there are any invalid review sections. */
  get hasInvalidReviewSections (): boolean {
    return (
      this.getAppValidate &&
      Object.values(this.getFlagsReviewCertify).some(val => val === false)
    )
  }
  /** Show fee summary only allowed filing types */
  get showFeeSummaryShared (): boolean {
    return (
      this.isSpecialResolutionFiling ||
      this.isAlterationFiling ||
      this.isFirmChangeFiling ||
      this.isFirmConversionFiling ||
      this.isRestorationFiling
    )
  }

  /** True if there is filing data for corrections - corrections has a single filing schedule. */
  get correctionHasFilingData () : boolean {
    return Boolean(
      this.getFilingData?.length > 0 &&
      this.getFilingData[0].filingTypeCode &&
      this.getFilingData[0].entityType
    )
  }

  /**
   * Handles actions from the fee summary component.
   * NOTE: This is only implemented for Alteration filings atm.
   * @param action the emitted action
   */
  protected async handleFeeSummaryActions (action: FeeSummaryActions): Promise<void> {
    switch (action) {
      case FeeSummaryActions.BACK:
        this.setSummaryMode(false)
        await this.scrollToTop(document.getElementById('app'))
        break
      case FeeSummaryActions.SAVE_RESUME_LATER:
        // Save filing and return to dashboard.
        await this.onClickSave()
        this.goToDashboard()
        break
      case FeeSummaryActions.CANCEL:
        this.goToDashboard()
        break
      case FeeSummaryActions.CONFIRM:
        if (this.isSummaryMode) {
          // Check validity, and if OK then save and file.
          await this.validateReviewCertifyPage()
        } else {
          // Check validity, and if OK then go to summary page.
          await this.validateCompanyInfoPage()
        }
        break
    }
  }

  /** Navigates to Manage Businesses dashboard. */
  protected goToManageBusinessDashboard (): void {
    this.fileAndPayInvalidNameRequestDialog = false
    this.setHaveUnsavedChanges(false)
    // FUTURE: Manage Businesses URL should come from config
    const manageBusinessUrl = `${sessionStorage.getItem('AUTH_WEB_URL')}business`
    Navigate(manageBusinessUrl)
  }

  /** Called to navigate to dashboard. */
  private async goToDashboard (force = false): Promise<void> {
    const dashboardUrl = sessionStorage.getItem('DASHBOARD_URL') + this.getBusinessId

    // check if there are no data changes
    if (!this.haveUnsavedChanges || force) {
      // navigate to dashboard
      this.setHaveUnsavedChanges(false)
      Navigate(dashboardUrl)
      return
    }

    // Prompt confirm dialog
    const hasConfirmed = await this.showConfirmDialog(
      this.$refs.confirm,
      'Unsaved Changes',
      'You have unsaved changes. Do you want to exit?',
      'Return to my Filing',
      'Exit Without Saving'
    )

    if (!hasConfirmed) {
      // if we get here, Cancel was clicked
      // ignore changes
      this.setHaveUnsavedChanges(false)
      // navigate to dashboard
      Navigate(dashboardUrl)
    }
  }

  /** Perform high level component validations before proceeding to summary page. */
  private async validateCompanyInfoPage (): Promise<void> {
    this.setComponentValidate(true)

    // Evaluate valid flags. Scroll to invalid components or continue to review.
    if (await this.validateAndScroll(this.getFlagsCompanyInfo, ComponentsCompanyInfo)) {
      // show summary page
      this.setSummaryMode(true)

      // reset validate flag
      this.setAppValidate(false)

      // Reset global flag
      this.setComponentValidate(false)

      // We don't change views, just interchange components, so scroll to top for better UX.
      await this.scrollToTop(document.getElementById('app'))
    }
  }

  /** Perform high level component validations before proceeding to filing and paying. */
  private async validateReviewCertifyPage (): Promise<void> {
    // Prompt app validations.
    this.setAppValidate(true)

    // Wait to allow app validation.
    await Vue.nextTick()

    // Evaluate valid flags. Scroll to invalid components or file alteration.
    if (await this.validateAndScroll(this.getFlagsReviewCertify, ComponentsReviewCertify)) {
      await this.onClickSave(false)
    }
  }

  /**
   * Will create/update a draft alteration or file and pay.
   * @returns a promise (ie, this is an async method).
   */
  private async onClickSave (isDraft = true): Promise<void> {
    // prevent double saving
    if (this.isBusySaving) return
    this.setIsSaving(true)

    let filingComplete: any
    try {
      let filing: AlterationFilingIF | ChgRegistrationFilingIF | ConversionFilingIF |
      RestorationFilingIF | SpecialResolutionFilingIF
      if (this.isAlterationFiling) filing = this.buildAlterationFiling(isDraft)
      if (this.isFirmChangeFiling) filing = this.buildChangeRegFiling(isDraft)
      if (this.isFirmConversionFiling) filing = this.buildConversionFiling(isDraft)
      if (this.isRestorationFiling) filing = this.buildRestorationFiling(isDraft)
      if (this.isSpecialResolutionFiling) filing = this.buildSpecialResolutionFiling(isDraft)

      // update the filing if we have a filingId, otherwise create a draft
      filingComplete = this.getFilingId
        ? await LegalServices.updateFiling(this.getBusinessId, this.getFilingId, filing, isDraft)
        : await LegalServices.createFiling(this.getBusinessId, filing, isDraft)

      // clear flag
      this.setHaveUnsavedChanges(false)
    } catch (error) {
      this.$root.$emit('save-error-event', error)
      this.setIsSaving(false)
      return
    }

    // if filing is not a draft, proceed with payment
    if (!isDraft && filingComplete) {
      // If Saving or Filing is successful then setIsFilingPaying should't be reset to false,
      // this prevent buttons from being re-enabled if the page is slow to redirect.
      this.setIsFilingPaying(true)
      const paymentToken = filingComplete.header?.paymentToken
      const filingId = filingComplete.header?.filingId

      if (paymentToken && filingId) {
        const isPaymentActionRequired: boolean = filingComplete.header?.isPaymentActionRequired
        const returnUrl = sessionStorage.getItem('DASHBOARD_URL') + this.getBusinessId +
          `?filing_id=${filingId}`

        // if payment action is required, navigate to Pay URL
        if (isPaymentActionRequired) {
          const authUrl = sessionStorage.getItem('AUTH_WEB_URL')
          const payUrl = authUrl + 'makepayment/' + paymentToken + '/' + encodeURIComponent(returnUrl)
          // assume Pay URL is always reachable
          // otherwise user will have to retry payment later
          Navigate(payUrl)
        } else {
          // otherwise go straight to dashboard
          Navigate(returnUrl)
        }
      } else {
        const error = new Error('Missing Payment Token or Filing ID')
        this.$root.$emit('save-error-event', error)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
// place app header on top of dialogs (and therefore still usable)
.app-header {
  z-index: 1000;
}

.right-side {
  position: relative;
}
</style>
